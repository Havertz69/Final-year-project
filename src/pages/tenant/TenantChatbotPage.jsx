import { useState, useRef, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, IconButton, Paper, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import tenantService from '../../services/tenantService';

export default function TenantChatbotPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    try {
      const res = await tenantService.sendChatMessage({ message: text, history });
      setMessages([...history, { role: 'assistant', content: res.data.reply || res.data.message }]);
    } catch {
      setMessages([...history, { role: 'assistant', content: 'Error: Could not get a response.' }]);
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Chatbot</Typography>
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardContent sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}>
          {messages.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              Start a conversation...
            </Typography>
          )}
          {messages.map((m, i) => (
            <Paper key={i} elevation={0}
              sx={{
                p: 1.5, maxWidth: '75%', borderRadius: 2,
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                bgcolor: m.role === 'user' ? 'primary.main' : 'grey.100',
                color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
              }}>
              <Typography variant="body2">{m.content}</Typography>
            </Paper>
          ))}
          {loading && <CircularProgress size={24} sx={{ alignSelf: 'flex-start', ml: 1 }} />}
          <div ref={endRef} />
        </CardContent>
        <Box sx={{ display: 'flex', p: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
          <TextField fullWidth size="small" placeholder="Type a message..." value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
          <IconButton color="primary" onClick={handleSend} disabled={loading || !input.trim()}>
            <SendIcon />
          </IconButton>
        </Box>
      </Card>
    </Box>
  );
}
