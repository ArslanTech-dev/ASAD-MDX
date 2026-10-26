import chalk from 'chalk';

const stamp = () => new Date().toISOString().slice(11, 19);

export default {
  info: (m) => console.log(chalk.cyan(`[${stamp()}] ℹ ${m}`)),
  success: (m) => console.log(chalk.green(`[${stamp()}] ✔ ${m}`)),
  warn: (m) => console.log(chalk.yellow(`[${stamp()}] ⚠ ${m}`)),
  error: (m, e) => console.log(chalk.red(`[${stamp()}] ✖ ${m}`), e?.message ?? ''),
  debug: (m) =>
    process.env.NODE_ENV === 'development' &&
    console.log(chalk.gray(`[${stamp()}] ⚙ ${m}`)),
};
