const { format, startOfDay, endOfDay } = require('date-fns');
const d = new Date();
console.log('Now:', format(d, "yyyy-MM-dd'T'HH:mm:ssXXX"));
console.log('Start:', format(startOfDay(d), "yyyy-MM-dd'T'HH:mm:ssXXX"));
console.log('End:', format(endOfDay(d), "yyyy-MM-dd'T'HH:mm:ssXXX"));
