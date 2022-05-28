const cookieParser = require('cookie-parser');
const session = require('express-session')
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
// pentru cookie-uri
app.use(cookieParser());
// pentru sesiuni // https://www.js-tutorials.com/nodejs-tutorial/nodejs-session-example-using-express-session/
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 100000
  }
}));

var actualUserName;
// aka middleware function
function functionForEveryRoute(req, res, next){
  // get session data
  sessionData = req.session;
  let userObj = {};
  if(sessionData.user) {
     userObj = sessionData.user;
  }
  actualUserName = userObj['username'];

  if (actualUserName === undefined){
    res.clearCookie("utilizator");
    req.session.user = {};
  }

  // pentru date intermediare
  res.locals["session_username"] = actualUserName;

  next();
}

// for all routes, execute a function
app.use('*', functionForEveryRoute);

// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) => {
  
  res.render('index.ejs', {cookie_username: req.cookies.utilizator});
});

// modul pentru filesystem
const fileSystem = require('fs');

var listaIntrebari;
fileSystem.readFile('intrebari.json', (error, data) => {
    if (error) throw error;
    listaIntrebari = JSON.parse(data);
});

var listaUtilizatori;
fileSystem.readFile('utilizatori.json', (error, data) => {
    if (error) throw error;
    listaUtilizatori = JSON.parse(data);
});

// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
	// în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
	res.render('chestionar', {intrebari: listaIntrebari});
});

app.get('/autentificare', (req, res) => {
  // in randare trebuie dat si pentru express variabila, aici un cookie
  res.render('autentificare.ejs', {cookie_login_error: req.cookies.mesajEroare});
});

app.get('/delogare', (req, res) => {
  // clear cookies and session before
  // set session data
  sessionData = req.session;
  sessionData.user.username = undefined;
  res.clearCookie("utilizator");

  res.redirect(302, 'autentificare');
})

app.post('/verificare-autentificare', (req, res) => {
  console.log(req.body);

  currentUserName = req.body["username"];
  currentUserPassword = req.body["password"];

  var found = false;
  for (const user of listaUtilizatori){
    userNameToCompare = user["nume_utilizator"];
    userPasswordToCompare = user["nume_utilizator"];

    if(userNameToCompare === currentUserName && userPasswordToCompare == currentUserName){
      found = true;
      break;
    }
  }
  
  if(found){
    // set session data
    sessionData = req.session;
    sessionData.user = {};
    sessionData.user.username = currentUserName;

    res.cookie("utilizator", currentUserName);
    res.clearCookie("mesajEroare");
    res.redirect(302, '/');
  }
  else{
    res.cookie("mesajEroare", "User not found");
    res.clearCookie("utilizator");
    res.redirect(302, 'autentificare');
  }
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

