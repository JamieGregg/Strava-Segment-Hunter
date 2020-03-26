const express = require('express')
const axios = require('axios').default;
const bodyParser = require('body-parser')

const app = express();
app.use(bodyParser.urlencoded({extended: false}))

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.listen(8000, () => {
  console.log('App is running on 8000!')
});
