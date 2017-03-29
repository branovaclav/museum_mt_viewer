const express = require('express');

const app = express();
const host = process.env.HOST || '127.0.0.1'; //'192.168.0.114';
const port = process.env.PORT || 3000;
const root = __dirname;

app.use(express.static(root));

app.listen(port, host, () => {
	console.log('Server started on localhost:3000');
	console.log('Press Ctrl+C to exit...');
});
