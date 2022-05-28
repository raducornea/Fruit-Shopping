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
    maxAge: 10000
  }
}));

var actualUserName;
var actualNume;
var actualPrenume;
// aka middleware function
function functionForEveryRoute(req, res, next){
  // get session data
  sessionData = req.session;
  let userObj = {};
  if(sessionData.user) {
     userObj = sessionData.user;
  }
  actualUserName = userObj['username'];
  actualNume = userObj['nume'];
  actualPrenume = userObj['prenume'];
  console.log(actualUserName);
  console.log(actualNume);
  console.log(actualPrenume);

  // e importanta, pentru ca nu mai pot da pe login daca nu am cookie curatate
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
  sessionData.user.nume = undefined;
  sessionData.user.prenume = undefined;
  res.clearCookie("utilizator");

  res.redirect(302, 'autentificare');
})

app.post('/verificare-autentificare', (req, res) => {
  console.log(req.body);

  currentUserName = req.body["username"];
  currentUserPassword = req.body["password"];
  currentNume = "";
  currentPrenume = "";

  var found = false;
  for (const user of listaUtilizatori){
    userNameToCompare = user["nume_utilizator"];
    userPasswordToCompare = user["nume_utilizator"];

    currentNume = user["nume"];
    currentPrenume = user["prenume"];

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
    sessionData.user.nume = currentNume;
    sessionData.user.prenume = currentPrenume;

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

///////////////////////////////////////////////
/*        vvvvv Laboratorul 12 vvvvv         */
///////////////////////////////////////////////

var sqlite3 = require('sqlite3');
var database;

// index.ejs  
// Serverul răspunde cu o pagină de Bine ai 
// venit! și cu lista de produse din baza de date.

// Serverul se conectează la serverul de baze de 
// date și creează o bază de date cu numele cumparaturi, 
// în care creează o tabelă produse
app.get('/creare-bd', (req, res) => {
  // cream baza de date cu numele cumparaturi
  new sqlite3.Database('./cumparaturi.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  createDatabase();
  
  // cream tabelele
  createTables(database);
  
  // redirect pe root
  res.redirect('/');
});

// cream tabelele
function createDatabase() {
  console.log("ok created");
  database = new sqlite3.Database('cumparaturi.db', (err) => {
    if (err) {
      console.log("Getting error " + err);
      exit(1);
    }
  });
}

// tabela cu numele produse
function createTables(newdb) {
  // Mere 2 kg 10 lei
  // Fructul dragonului 1 buc 5 lei
  newdb.exec(`
  create table produse (
      id_produs int primary key not null,
      nume_produs text not null,
      cantitate_produs real not null,
      unitate_masura_produs text not null,
      valoare_produs real not null,
      unitate_masura_monetara text not null
  );

      `, ()  => {
          console.log("succes la creare?");
          // nu rulam niciun querry momentan wtf
          // runQueries(newdb);
  });
}

// inserturi in tabela produse
function insertValuesInTable(newdb) {
  // Mere 2 kg 10 lei
  // Fructul dragonului 1 buc 5 lei
  newdb.exec(`
  insert into produse (id_produs, nume_produs, cantitate_produs, unitate_masura_produs, valoare_produs, unitate_masura_monetara)
      values (1, 'Mere', 1, 'kg', 5, 'lei'),
             (2, 'Fructul Dragonului', 1, 'buc', 7, 'lei'),
             (3, 'Sapote Negru', 1, 'buc', 15, 'lei'),
             (4, 'Carambola', 1, 'buc', 10, 'lei'),
             (5, 'Afine', 500, 'g', 7, 'lei'),
             (6, 'Capsuni', 250, 'g', 4.5, 'lei'),
             (7, 'Banane', 1, 'kg', 4, 'lei');

      `, ()  => {
          console.log("succes la inserare?");
          // nu rulam niciun querry momentan wtf
          // runQueries(newdb);
  });
}

// Serverul se conectează la serverul de baze de date 
// și inserează mai multe produse în tabela produse, 
// după care răspunde clientului cu un redirect spre resursa /.
app.get('/inserare-bd', (req, res) => {
  // cream baza de date cu numele cumparaturi
  new sqlite3.Database('./cumparaturi.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  createDatabase();
  
  // inseram produse in tabela produse
  insertValuesInTable(database);
  
  // redirect pe root
  res.redirect('/');
});

// POST sau GET	/adaugare-cos
// Serverul adaugă id-ul produsului specificat în corpul 
// mesajului HTTP într-un vector din variabila de 
// sesiune (sau într-un vector global dacă nu ați implementat 
// tema 3 din laboratorul 11).

// GET /vizualizare-cos
// Serverul răspunde cu o pagină de 
// Vizualizare coș prin inserarea vizualizare-cos.ejs 
// în layout.ejs și returnarea rezultatului la client.
