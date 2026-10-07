import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/preact';
import { afterEach } from 'vitest';

process.env.TZ = 'America/Sao_Paulo';

// Sem `globals`, o testing-library não registra a limpeza automática entre testes.
afterEach(() => cleanup());
