require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkLogs() {
    const { count, error: err1 } = await supabase.from('auditoria_logs').select('*', { count: 'exact', head: true });
    if (err1) console.error(err1);
    console.log('Total Logs:', count);

    // Let's get the last 100 logs
    const { data, error: err2 } = await supabase.from('auditoria_logs').select('tabla_afectada, accion').order('fecha_registro', { ascending: false }).limit(100);
    if (err2) console.error(err2);
    
    if (data) {
        const tableCounts = {};
        for (const row of data) {
            tableCounts[row.tabla_afectada] = (tableCounts[row.tabla_afectada] || 0) + 1;
        }
        console.log('Last 100 breakdown:', tableCounts);
    }
}
checkLogs();
