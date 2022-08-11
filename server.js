const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');
const compression = require('compression')
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
dotenv.config({ path: './config/.env' });

connectDB();

const tours = require('./routes/tours');
const auth = require('./routes/auth');
const users = require('./routes/user');
const reviews = require('./routes/reviews');
const booking = require('./routes/bookings');
const viewRouter = require('./routes/viewsRoutes');
const bookingController=require('./controllers/booking');

const app = express();
app.enable('trust proxy');
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'Public')))

app.post(
    '/webhook-checkout',
    bodyParser.raw({ type: 'application/json' }),
    bookingController.webhookCheckout
  );

app.use(express.json({ limit: '10kb' }));

app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use(mongoSanitize());

app.use(helmet());

app.use(xss());

app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price'
        ]
    })
);

app.use(cors());

const Limitter = rateLimit({
    max: 100,
    window: 60 * 60 * 1000,   
    message: "Too many requests with same IP please try again after one hour"
});
app.use('/api', Limitter);

app.use(compression());

app.use('/', viewRouter);
app.use('/api/v1/tours', tours);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);
app.use('/api/v1/reviews', reviews);
app.use('/api/v1/booking', booking);

app.all('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        res.status(404).json({
            success: false,
            msg: `Cannot find this ${req.originalUrl} on server`
        })
    }
    res.status(404).render('error', {
        title: `404 page`,
        msg: `This page isn't available`

    });
});


app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
    PORT,
    console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
    )
);

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`.red);
    server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
    });
});
