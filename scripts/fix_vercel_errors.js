const fs = require('fs');

function replaceFile(path, replacements) {
    if (!fs.existsSync(path)) {
        console.log("File not found:", path);
        return;
    }
    let content = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    fs.writeFileSync(path, content);
}

// 1. actualizar-password
replaceFile('src/app/actualizar-password/page.tsx', [
    ['({ session }) =>', '({ session }: { session: any }) =>'],
    ['(event, session) =>', '(event: any, session: any) =>']
]);

// 2. CatalogoPublicoClient
replaceFile('src/app/catalogo/[slug]/CatalogoPublicoClient.tsx', [
    ['(payload) =>', '(payload: any) =>']
]);

// 3. ComprasClient
replaceFile('src/app/dashboard/compras/ComprasClient.tsx', [
    ["const liveTableFilter = empresa?.id ? `id_empresa=eq.${empresa.id}` : undefined;", "const liveTableFilter = (empresa as any)?.id ? `id_empresa=eq.${(empresa as any).id}` : undefined;"]
]);

// 4. finanzas
replaceFile('src/app/dashboard/finanzas/page.tsx', [
    ['(s =>', '((s: any) =>']
]);

// 5. dashboard page
replaceFile('src/app/dashboard/page.tsx', [
    ['(s =>', '((s: any) =>']
]);

// 6. ShrinkageContainer
replaceFile('src/app/mermas/ShrinkageContainer.tsx', [
    ['(acc, curr)', '(acc: any, curr: any)']
]);

// 7. CuentasAbiertasWidget
replaceFile('src/components/pos/CuentasAbiertasWidget.tsx', [
    ['(s =>', '((s: any) =>'],
    ['(payload) =>', '(payload: any) =>']
]);

// 8. LiveSalesFeed
replaceFile('src/components/pos/LiveSalesFeed.tsx', [
    ['(payload) =>', '(payload: any) =>'],
    ['(p =>', '((p: any) =>']
]);

// 9. RecentSalesWidget
replaceFile('src/components/pos/RecentSalesWidget.tsx', [
    ['(payload) =>', '(payload: any) =>']
]);

// 10. useCajaSync
replaceFile('src/hooks/useCajaSync.ts', [
    ['(payload) =>', '(payload: any) =>'],
    ['(status) =>', '(status: any) =>']
]);

// 11. useDashboardData
replaceFile('src/hooks/useDashboardData.ts', [
    ['(s =>', '((s: any) =>']
]);

// 12. useLiveTable
replaceFile('src/hooks/useLiveTable.ts', [
    ['(payload) =>', '(payload: any) =>']
]);

console.log("Done fixing TS errors");
