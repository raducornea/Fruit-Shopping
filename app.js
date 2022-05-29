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
    maxAge: 1000000
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
app.get('/', (req, res) => { // mmm root incepe cu 69 hmmmm
  // gosh, linia ma-sii... luam typeerror din asta ca pica pe undefined
  var promise1 = createDatabase();
  promise1.then(() => {
    console.log("aaaaa1");
  
    var promise = runQueries();
    promise.then(() => {
      console.log("aaaaa2");
      res.render('index.ejs', {cookie_username: req.cookies.utilizator, html_content: tableContent});
    });
  });
});
 
var tableContent = "please change??????";


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
  sessionData.user.produse = [];
  sessionData.user.is_admin = undefined;
  res.clearCookie("utilizator");

  res.redirect(302, 'autentificare');
})

app.post('/verificare-autentificare', (req, res) => {
  console.log(req.body);

  currentUserName = req.body["username"];
  currentUserPassword = req.body["password"];
  currentNume = "";
  currentPrenume = "";
  is_admin = false;

  if (currentUserName === "admin" && currentUserPassword === "admin"){
    is_admin = true;
  }
  console.log(is_admin);

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
    sessionData.user.produse = [];
    sessionData.user.is_admin = is_admin;

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
const res = require('express/lib/response');
var database;

// index.ejs  
// Serverul răspunde cu o pagină de Bine ai 
// venit! și cu lista de produse din baza de date.

// Serverul se conectează la serverul de baze de 
// date și creează o bază de date cu numele cumparaturi, 
// în care creează o tabelă produse
app.get('/creare-bd', (req, res) => {
  // cream baza de date cu numele cumparaturi
  createDatabase();
  
  // cream tabelele
  createTables(database);
  
  // redirect pe root
  res.redirect('/');
});

// cream tabelele
function createDatabase() {
  return new Promise((resolve, reject) => {
    new sqlite3.Database('./cumparaturi.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

    console.log("ok created");
    database = new sqlite3.Database('cumparaturi.db', (err) => {
      if (err) {
        console.log("Getting error " + err);
        exit(1);
      }                                                                                                                                                                                     
    });
    resolve();
  });
}

// tabela cu numele produse
function createTables(newdb) {
  // Mere 2 kg 10 lei
  // Fructul dragonului 1 buc 5 lei
  newdb.exec(`
  create table produse (
      id_produs INTEGER PRIMARY KEY AUTOINCREMENT,
      nume_produs text unique not null,
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
  insert into produse (nume_produs, cantitate_produs, unitate_masura_produs, valoare_produs, unitate_masura_monetara)
      values ('Mere', 1, 'kg', 5, 'lei'),
             ('Fructul Dragonului', 1, 'buc', 7, 'lei'),
             ('Sapote Negru', 1, 'buc', 15, 'lei'),
             ('Carambola', 1, 'buc', 10, 'lei'),
             ('Afine', 500, 'g', 7, 'lei'),
             ('Capsuni', 250, 'g', 4.5, 'lei'),
             ('Banane', 1, 'kg', 4, 'lei');

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
  // inseram produse in tabela produse
  insertValuesInTable(database);
  
  // redirect pe root
  res.redirect('/');
});

function runQueries() {
  return new Promise((resolve, reject) => {
    database.all(`
    select * from produse
    `, (err, rows) => {
        // misto ca nu-l actualizeaza decat daca pun asta... wtf man xd
        tableContent = `<table>`;

        if (rows !== undefined)
        rows.forEach(row => {

            tableContent += `<tr>`;

            tableContent += `<td>${row.id_produs}</td>`;
            tableContent += `<td>${row.nume_produs}</td>`;
            tableContent += `<td>${row.cantitate_produs}</td>`;
            tableContent += `<td>${row.unitate_masura_produs}</td>`;
            tableContent += `<td>${row.valoare_produs}</td>`;
            tableContent += `<td>${row.unitate_masura_monetara}</td>`;
            tableContent += `
              <td>
                <form method="post" action="/adaugare-cos">
                  <input type="submit" class="ADD_TO_CART" value="Adaugă în coș">
                  <input type="hidden" name="id" value="${row.id_produs}">
                </form>
              </td>
            `;
            tableContent += `</tr>`;
            // console.log(row.nume_produs);
        });

        tableContent += `</table>`;
        resolve();
    });
  });
}

// Serverul adaugă id-ul produsului specificat în corpul 
// mesajului HTTP într-un vector din variabila de sesiune
app.post('/adaugare-cos', (req, res) => {
  var id_produs = req.body.id;
  console.log(id_produs);

  // set session data
  sessionData = req.session;
  sessionData.user.produse.push(id_produs);

  // get session data
  let userObj = {};
  if(sessionData.user) {
     userObj = sessionData.user;
  }
  lista_produse_cumparate = userObj['produse'];
  console.log(lista_produse_cumparate);

  res.redirect('/');
});

// Serverul răspunde cu o pagină de 
// Vizualizare coș prin inserarea vizualizare-cos.ejs 
// în layout.ejs și returnarea rezultatului la client.
var tableAddedProducts = "";
app.get('/vizualizare-cos', (req, res) => {
  let userObj = {};
  if(sessionData.user) {
     userObj = sessionData.user;
  }
  lista_produse_cumparate = userObj['produse'];
  console.log(lista_produse_cumparate);

  if(lista_produse_cumparate === undefined){
    res.render('vizualizare-cos.ejs', {html_content_produse: "<p>Lista este goala</p>"});
  }
  else{
    var promise = executeFor();
    promise.then(() => {
      console.log("aaaaaTRIPLE");
      res.render('vizualizare-cos.ejs', {html_content_produse: tableAddedProducts});
    })
  }
});

function executeFor(){
  return new Promise((resolve, reject) => {
    // get session data
    let userObj = {};
    if(sessionData.user) {
      userObj = sessionData.user;
    }
    lista_produse_cumparate = userObj['produse'];
    console.log(lista_produse_cumparate);

    var promises = [];
    var counter = 0;
    tableAddedProducts = `<table>`;
    // trebuie parcursa toata lista...
    for(const id of lista_produse_cumparate){
      promises.push(selectRows(parseInt(id), ++counter));
    }

    function compare( a, b ) {
      if ( a.counter < b.counter ){
        return -1;
      }
      if ( a.counter > b.counter ){
        return 1;
      }
      return 0;
    }

    // varianta 1 nesincrona
    // trebuie facute toate promisiunile :O
    Promise.all(promises).then((values) => {
      console.log(values);

      var sorted_list = values.sort(compare);
      for(const myobject of sorted_list){
        tableAddedProducts += `<tr>`;
        
        tableAddedProducts += `<td>${myobject.counter}</td>`;
        tableAddedProducts += `<td>${myobject.nume_produs}</td>`;
        tableAddedProducts += `<td>${myobject.cantitate_produs}</td>`;
        tableAddedProducts += `<td>${myobject.unitate_masura_produs}</td>`;
        tableAddedProducts += `<td>${myobject.valoare_produs}</td>`;
        tableAddedProducts += `<td>${myobject.unitate_masura_monetara}</td>`;

        tableAddedProducts += `</tr>`;
      }

      tableAddedProducts += `</table>`;
      resolve();
    })
  });
}

function selectRows(id, counter){
  return new Promise((resolve, reject) => {
    var myobject = {};

    database.all(`
    select * from produse where id_produs = ?
    `, id, (err, rows) => {

        rows.forEach(row => {
          // obiect care contine datele de care avem nevoie
          myobject.counter = counter;
          myobject.nume_produs = row.nume_produs;
          myobject.cantitate_produs = row.cantitate_produs;
          myobject.unitate_masura_produs = row.unitate_masura_produs;
          myobject.valoare_produs = row.valoare_produs;
          myobject.unitate_masura_monetara = row.unitate_masura_monetara;

          resolve(myobject);
        });
    });
  });
}

////////////////////////////////////////////////////
//          vvvvv Laboratorul 13 vvvvv            //
////////////////////////////////////////////////////

app.get('/admin', (req, res) => {
  // get session data
  let userObj = {};
  if(sessionData.user) {
    userObj = sessionData.user;
  }

  admin_role = userObj['is_admin'];

  res.render('admin.ejs', {html_admin: admin_role});
})

app.post('/admin', (req, res) => {
  var nume = req.body.nume;
  var cantitate = parseFloat(req.body.cantitate);
  var umcantitate = req.body.umcantitate;
  var pret = parseFloat(req.body.pret);
  var umpret = req.body.umpret;

  // if(!(nume === "" || umcantitate === "" || umpret === "" || isNaN(pret) || isNaN (cantitate))){
    console.log("yea");

    insertValuesInTableCUSTOM(nume, cantitate, umcantitate, pret, umpret);
  // }

  res.render('admin.ejs', {html_admin: admin_role});
})

// inserturi in tabela produse
function insertValuesInTableCUSTOM(nume, cantitate, unitate_masura, pret, umpret) {
  database.run(`
  insert into produse (nume_produs, cantitate_produs, unitate_masura_produs, valoare_produs, unitate_masura_monetara)
      values (?, ?, ?, ?, ?);

      `, nume, cantitate, unitate_masura, pret, umpret, ()  => {
          console.log("succes la inserare?");
          // nu rulam niciun querry momentan wtf
          // runQueries(newdb);
  });
}