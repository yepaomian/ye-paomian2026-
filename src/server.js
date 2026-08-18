const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`Invoice Tool running at ${config.baseUrl}`);
});
