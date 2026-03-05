import { useState, useRef, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, IconButton, Paper, CircularProgress, Divider } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import tenantService from '../../services/tenantService';
import TenantPageShell from '../../components/tenant/TenantPageShell';

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
    <TenantPageShell
      title="Chat Assistant"
      subtitle="Ask about rent, payments, or general help."
    >
      <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2.5, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight={700}>Conversation</Typography>
            <Typography variant="body2" color="text.secondary">Your messages stay on this device.</Typography>
          </Box>
          <Divider />
          <Box sx={{ height: { xs: '60vh', md: '62vh' }, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, p: 2.5 }}>
          {messages.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              Start a conversation...
            </Typography>
          )}
          {messages.map((m, i) => (
            <Paper key={i} elevation={0}
              sx={{
                p: 1.5,
                maxWidth: { xs: '90%', md: '75%' },
                borderRadius: 3,
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                bgcolor: m.role === 'user' ? 'primary.main' : 'background.paper',
                color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                border: m.role === 'user' ? 'none' : '1px solid',
                borderColor: m.role === 'user' ? 'transparent' : 'divider',
              }}>
              <Typography variant="body2">{m.content}</Typography>
            </Paper>
          ))}
          {loading && <CircularProgress size={24} sx={{ alignSelf: 'flex-start', ml: 1 }} />}
          <div ref={endRef} />
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', p: 2, gap: 1.5, bgcolor: 'background.paper' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
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
