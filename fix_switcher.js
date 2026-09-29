const fs = require('fs');

let content = fs.readFileSync('src/components/AccountSwitcher.tsx', 'utf-8');

// Inside handleSwitch
content = content.replace(
    "const res = await switchAccount(account.id);",
    "if (typeof window !== 'undefined') { localStorage.removeItem('niteo_terminal_vinculado'); }\n      const res = await switchAccount(account.id);"
);

// Inside handleAddAccount
content = content.replace(
    "const res = await addAccountToVault(formData);",
    "if (typeof window !== 'undefined') { localStorage.removeItem('niteo_terminal_vinculado'); }\n      const res = await addAccountToVault(formData);"
);

fs.writeFileSync('src/components/AccountSwitcher.tsx', content, 'utf-8');
console.log("Updated AccountSwitcher.tsx");
