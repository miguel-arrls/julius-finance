import { main } from './cli-dados-iniciais';

process.exitCode = main(process.argv.slice(2));
