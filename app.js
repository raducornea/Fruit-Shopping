const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')

const app = express();

const port = 6789;

// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));

// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) => {
  res.render('index.ejs');
});

// citire fisier json cu intrebarile in mod asincron
const filesystem = require('fs');
var listaIntrebari;
filesystem.readFile('intrebari.json', (error, data) => {
    if (error) throw error;
    listaIntrebari = JSON.parse(data);
});

// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
	// în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
	res.render('chestionar', {intrebari: listaIntrebari});
});

app.get('/autentificare', (req, res) => {
  res.render('autentificare.ejs');
});

app.post('/verificare-autentificare', (req, res) => {
  console.log(req.body);
  res.render('');
});

// logica pentru rezultatul chestionarului
app.post('/rezultat-chestionar', (req, res) => {
  console.log(req.body);
  var responses = req.body;
  var correctAnswers = 0;

  for (let index = 0; index < listaIntrebari.length; ++index){
    var result = responses["q" + index];
    var correctResult = listaIntrebari[index]["corect"];

    if (result == correctResult)
      ++correctAnswers;
  }

  // se redirectioneaza la numarul de raspunsuri corecte
  res.redirect('/rezultat-chestionar?answers=' + correctAnswers);
});

// pagina care contine numarul de raspunsuri corecte propriu-zisa
app.get('/rezultat-chestionar', (req, res) => {
    var correctAnswers = req.query.answers;
    res.render('rezultat-chestionar', { numarCorecteDeTrimis: correctAnswers });
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:${port}`));

