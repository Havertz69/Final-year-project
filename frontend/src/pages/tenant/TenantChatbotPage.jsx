import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Card, CardContent, TextField, IconButton, 
  Paper, CircularProgress, Divider, Avatar 
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import tenantService from '../../services/tenantService';
import TenantPageShell from '../../components/tenant/TenantPageShell';
import { getApiErrorMessage } from '../../utils/apiUtils';

export default function TenantChatbotPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your property assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await tenantService.sendChatMessage({ 
        message: text, 
        history: messages 
      });
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: res.data.reply || res.data.message 
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: getApiErrorMessage(e, 'I encountered an error. Please try again.') 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TenantPageShell
      title="Chat Assistant"
      subtitle="Ask about rent, payments, or general help."
    >
      <Card sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" fontWeight={700}>AI Assistant</Typography>
            <Typography variant="caption" color="text.secondary">Ask about rent, maintenance, or policies.</Typography>
          </Box>
          
          <Box sx={{ 
            height: '60vh', 
            overflow: 'auto', 
            p: 3, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2,
            bgcolor: '#ffffff'
          }}>
            {messages.map((m, i) => (
              <Box key={i} sx={{ 
                display: 'flex', 
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                gap: 1.5,
                alignItems: 'flex-end',
                mb: 1
              }}>
                <Avatar sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: m.role === 'user' ? 'primary.main' : 'secondary.main',
                  fontSize: '0.8rem'
                }}>
                  {m.role === 'user' ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
                </Avatar>
                <Paper elevation={0} sx={{
                  p: 2,
                  maxWidth: '80%',
                  borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  bgcolor: m.role === 'user' ? 'primary.main' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  boxShadow: m.role === 'user' ? '0 4px 12px rgba(37,99,235,0.2)' : 'none'
                }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{m.content}</Typography>
                </Paper>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  <SmartToyIcon fontSize="small" />
                </Avatar>
                <CircularProgress size={16} />
              </Box>
            )}
            <div ref={endRef} />
          </Box>

          <Divider />
          <Box sx={{ p: 2, display: 'flex', gap: 1, bgcolor: '#f8fafc' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="How can I help you today?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: '#fff' } }}
            />
            <IconButton 
              color="primary" 
              onClick={handleSend} 
              disabled={loading || !input.trim()}
              sx={{ 
                bgcolor: 'primary.main', 
                color: '#fff', 
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    </TenantPageShell>
  );
}
