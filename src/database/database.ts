import { exec } from 'child_process';

export async function initDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(`createdb ${dbName}`, (error, stdout, stderr) => {
            if (error) {
                if (stderr.includes('already exists')) {
                    console.log(`Base de données "${dbName}" existe déjà.`);
                    return resolve();
                }
                console.error(`Erreur lors de la création de la base de données "${dbName}": ${stderr}`);
                return reject(error);
            }
            console.log(`Base de données "${dbName}" créée avec succès.`);
            resolve();
        });
    });
}