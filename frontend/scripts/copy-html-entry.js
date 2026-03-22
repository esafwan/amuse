import { copyFileSync, mkdirSync } from 'fs'
const src = '../amuse/public/frontend/index.html'
const dest = '../amuse/www/amuse.html'
try {
    mkdirSync('../amuse/www', { recursive: true })
    copyFileSync(src, dest)
    console.log('Copied index.html → amuse/www/amuse.html')
} catch (e) {
    console.error('Failed to copy index.html. Ensure destination exists.', e)
}
