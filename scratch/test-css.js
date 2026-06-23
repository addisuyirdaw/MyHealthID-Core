import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import fs from 'fs';

const css = fs.readFileSync('app/globals.css', 'utf8');
postcss([tailwindcss])
  .process(css, { from: 'app/globals.css', to: 'output.css' })
  .then(result => {
    fs.writeFileSync('output.css', result.css);
    console.log("CSS COMPILED SUCCESSFULLY!");
    console.log("Length of compiled CSS:", result.css.length);
  })
  .catch(err => {
    console.error("CSS COMPILATION FAILED:", err);
  });
