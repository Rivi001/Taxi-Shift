// Report errors from the whole module graph, including missing deployment files.
import('./main.js').then(()=>window.taxiBoot.ready()).catch(error=>{
  console.error('Taxi Shift startup failed',error);
  window.taxiBoot.fail(`The game could not start: ${error.message || error}. Open “Check this phone” below and share the results.`);
});
