const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Указываем папку с публичными файлами, включая стили и изображения
app.use(express.static(path.join(__dirname, 'public')));  // Папка для статики (изображения, стили и т.д.)

// Настройка Pug
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));

// Загружаем начальные данные из JSON
const dataFile = path.join(__dirname, 'data', 'books.json');
let books = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// Главная страница со списком книг
app.get('/', (req, res) => {
    const { available, overdue } = req.query;  // Параметры из GET-запроса

    let filteredBooks = books;

    // Фильтрация по доступности
    if (available === 'true') {
        filteredBooks = filteredBooks.filter(book => book.available);
    }

    // Фильтрация по просроченным книгам
    if (overdue === 'true') {
        const today = new Date().toISOString().split('T')[0];
        filteredBooks = filteredBooks.filter(book => !book.available && book.returnDate < today);
    }

    res.render('index', { books: filteredBooks });
});


// Страница добавления новой книги
app.get('/book/new', (req, res) => {
    res.render('book', { book: null });
});

// Страница редактирования/просмотра книги
app.get('/book/:id', (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));
    res.render('book', { book });
});

// Добавление новой книги
app.post('/book', (req, res) => {
    const newBook = {
        id: books.length + 1,  // Генерация нового ID
        title: req.body.title,
        author: req.body.author,
        releaseDate: req.body.releaseDate,
        available: true,  // По умолчанию книга доступна
        borrower: null,
        returnDate: null
    };
    books.push(newBook);
    saveBooks();  // Сохраняем изменения в файле
    res.redirect('/');  // Перенаправляем на главную страницу
});


// Редактирование книги
app.post('/book/:id', (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));

    // Обновляем основную информацию о книге
    book.title = req.body.title;
    book.author = req.body.author;
    book.releaseDate = req.body.releaseDate;

    // Если книга уже забрана, сохраняем borrower и returnDate, иначе делаем ее доступной
    if (book.borrower && book.returnDate) {
        book.available = false; // Книга занята, сохраняем текущего пользователя и дату возврата
    } else {
        book.available = true;
        book.borrower = null;
        book.returnDate = null;
    }

    saveBooks();
    res.redirect('/');
});


// Удаление книги
app.post('/book/:id/delete', (req, res) => {
    books = books.filter(b => b.id !== parseInt(req.params.id));
    saveBooks();
    res.redirect('/');
});

// Забрать книгу (borrow)
app.post('/book/:id/borrow', (req, res) => {
    const bookId = parseInt(req.params.id);
    const book = books.find(b => b.id === bookId);

    if (!book) {
        return res.status(404).send('Книга не найдена');
    }

    // Обновляем данные книги: она теперь недоступна
    book.available = false;
    book.borrower = req.body.borrower;
    book.returnDate = req.body.returnDate;

    // Сохраняем изменения в JSON-файле
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
        // Отправляем ошибку при несовпадении имени
        return res.render('book', { book, error: 'Вы не можете вернуть эту книгу, так как её брал другой пользователь.' });
    }

    // Обновляем данные книги: она теперь снова доступна
    book.available = true;
    book.borrower = null;
    book.returnDate = null;

    saveBooks();
    res.redirect(`/book/${book.id}`);
});



// Функция сохранения данных в JSON
function saveBooks() {
    fs.writeFileSync(dataFile, JSON.stringify(books, null, 2));
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
