import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import cyclesRouter from './routes/cycles';
import cardsRouter from './routes/cards';
import templatesRouter from './routes/templates';
import cardSetupRouter from './routes/cardSetup';

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/cycles', cyclesRouter);
app.use('/api/v1', cardsRouter);
app.use('/api/v1/competency-templates', templatesRouter);
app.use('/api/v1/cards', cardSetupRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
