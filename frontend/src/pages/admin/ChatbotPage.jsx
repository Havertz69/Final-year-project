import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, IconButton, List, ListItem,
  ListItemText, Avatar, Divider, InputAdornment, Fade
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';
import { getApiErrorMessage, parseListResponse } from '../../utils/apiUtils';

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    { id: 'welcome', body: "Hello! I'm your Property Pulse assistant. Ask me about occupancy, revenue, or units.", sender_role: 'ADMIN', timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now(),
      body: input,
      sender_role: 'TENANT', // Simplification for UI display
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const res = await adminService.sendChatMessage({
        message: currentInput,
        history: messages
      });
      
      const botMsg = {
        id: Date.now() + 1,
        body: res.data.reply || res.data.message,
        sender_role: 'ADMIN',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        id: 'err', 
        body: `Error: ${getApiErrorMessage(e)}`, 
        sender_role: 'ADMIN', 
        timestamp: new Date().toISOString() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPageShell title="Assistant" subtitle="Chat with the Property Pulse bot for quick insights.">
      <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column', p: 2, borderRadius: 2 }}>
        <Box 
          ref={scrollRef}
          sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, px: 2, py: 1, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {messages.map((m, i) => {
            const isMe = m.sender_role !== 'ADMIN';
            return (
              <Box 
                key={m.id || i}
                sx={{ 
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                  {!isMe && <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}><SmartToyIcon sx={{ fontSize: 16 }} /></Avatar>}
                  <Typography variant="caption" color="text.secondary">
                    {isMe ? 'You' : 'Assistant'} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  {isMe && <Avatar sx={{ width: 24, height: 24, bgcolor: 'secondary.main' }}><PersonIcon sx={{ fontSize: 16 }} /></Avatar>}
                </Box>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 1.5, 
                    bgcolor: isMe ? 'primary.main' : 'grey.100',
                    color: isMe ? 'white' : 'text.primary',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <Typography variant="body2">{m.body}</Typography>
                </Paper>
              </Box>
            );
          })}
          {loading && (
            <Box sx={{ alignSelf: 'flex-start', display: 'flex', gap: 1, alignItems: 'center' }}>
              <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.300' }}><SmartToyIcon sx={{ fontSize: 16, color: 'grey.600' }} /></Avatar>
              <Typography variant="caption" color="text.secondary">Assistant is thinking...</Typography>
            </Box>
          )}
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Type a message (e.g., 'What is the occupancy?')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || loading}>
                    <SendIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>
    </AdminPageShell>
  );
}
