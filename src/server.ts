import express from 'express';
import cors from 'cors';
import { config } from './config';
import router from './routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: Groq API Key present: ${!!config.groqApiKey}`);
});