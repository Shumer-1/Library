const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
//
// Фигма, иконки, конфирм.
//

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));

const dataFile = path.join(__dirname, 'data', 'books.json');
let books = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

app.get('/', (req, res) => {
    res.render('index', { books: books });
});

app.get('/filters', (req, res) => {
    const { available, overdue } = req.query;

    let filteredBooks = books;

    if (available === 'true') {
        filteredBooks = filteredBooks.filter(book => book.available);
    }

    if (overdue === 'true') {
        const today = new Date().toISOString().split('T')[0]; // Текущая дата в формате YYYY-MM-DD
        filteredBooks = filteredBooks.filter(book => !book.available && book.returnDate < today);
    }

    res.json({ books: filteredBooks });
});


app.get('/book/new', (req, res) => {
    res.render('book', { book: null });
});

app.get('/book/:id', (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));
    res.render('book', { book });
});

app.post('/book', (req, res) => {
    let parts = req.body.releaseDate.split("-");
    let newDate = parts[2] + "-" + parts[1] + "-" + parts[0];
    const newBook = {
        id: books.length + 1,
        title: req.body.title,
        author: req.body.author,
        releaseDate: newDate,
        available: true,
        borrower: null,
        returnDate: null,
        coverImage: "/default.jpg"
    };
    books.push(newBook);
    saveBooks();
    res.redirect('/');
});

app.post('/book/:id', (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));
    let parts = req.body.releaseDate.split("-");
    let newDate = parts[2] + "-" + parts[1] + "-" + parts[0];
    book.title = req.body.title;
    book.author = req.body.author;
    book.releaseDate = newDate;
    books.forEach(book => {
        if (book.id <= 6 && book.returnDate){
            let parts = book.returnDate.split("-");
            book.returnDate = parts[2] + "-" + parts[1] + "-" + parts[0];
        }
    });

    if (book.borrower && book.returnDate) {
        book.available = false;
    } else {
        book.available = true;
        book.borrower = null;
        book.returnDate = null;
    }

    saveBooks();
    res.redirect('/');
});


app.post('/book/:id/delete', (req, res) => {
    books = books.filter(b => b.id !== parseInt(req.params.id));
    let counter = 0;
    books.forEach(book => {
        book.id = counter++;
    });

    saveBooks();
    res.json({ books: books});
});

app.post('/book/:id/borrow', (req, res) => {
    const bookId = parseInt(req.params.id);
    const book = books.find(b => b.id === bookId);

    if (!book) {
        return res.status(404).send('Книга не найдена');
    }
    let parts = req.body.returnDate.split("-");
    let newDate = parts[2] + "-" + parts[1] + "-" + parts[0];
    book.available = false;
    book.borrower = req.body.borrower;
    book.returnDate = newDate;

    saveBooks();
    res.redirect(`/book/${book.id}`);
});

app.post('/book/:id/return', (req, res) => {
    const bookId = parseInt(req.params.id);
    const book = books.find(b => b.id === bookId);

    if (!book) {
        return res.status(404).send('Книга не найдена');
    }

    const returnerName = req.body.borrower;

    if (!book.borrower || book.borrower !== returnerName) {
        return res.render('book', { book, error: 'Вы не можете вернуть эту книгу, так как её брал другой пользователь.' });
    }

    book.available = true;
    book.borrower = null;
    book.returnDate = null;

    saveBooks();
    res.redirect(`/book/${book.id}`);
});


function saveBooks() {
    fs.writeFileSync(dataFile, JSON.stringify(books, null, 2));
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
