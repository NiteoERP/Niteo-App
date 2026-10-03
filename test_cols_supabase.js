const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gqlhillifpxizbaqaagl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGhpbGxpZnB4aXpiYXFhYWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NzkzMjMsImV4cCI6MjEwMjE1NTMyM30.4Ds9tieFcNxPbznW4VpiD9w3lBSmkb4SmU5YxtlzQXs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase.from('productos').select('*').limit(1);
    if (error) console.error(error);
    else if (data && data.length > 0) {
        console.log(Object.keys(data[0]));
    } else {
        console.log("No data");
    }
}
main();
