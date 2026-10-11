import test from 'node:test';
import assert from 'node:assert/strict';
import {RACES,ROADS,CARS,streetRoute,routeTurns,passedCheckpoint,createPlayer,stepPlayer} from '../src/core.js';

test('every race gate is on a straight with clearance from every junction',()=>{
  for(const race of RACES)for(const [x,z] of race.points){
    assert.notEqual(ROADS.includes(x),ROADS.includes(z),`${race.id}: gate must lie on exactly one road axis`);
    const clearance=Math.min(...ROADS.map(r=>Math.abs((ROADS.includes(x)?z:x)-r)));
    assert.ok(clearance>=28,`${race.id}: gate too close to junction (${clearance}m)`);
  }
});
test('turn guidance collapses straight nodes and labels both directions correctly',()=>{
  const turns=routeTurns([{x:0,z:120},{x:0,z:60},{x:0,z:0},{x:-120,z:0},{x:-120,z:-120}]);
  assert.equal(turns.length,2);assert.equal(turns[0].direction,'left');assert.equal(turns[0].distance,120);assert.equal(turns[1].direction,'right');
  for(const race of RACES){
    const start={x:race.start[0],z:race.start[1]},first={x:race.points[0][0],z:race.points[0][1]},next={x:race.points[1][0],z:race.points[1][1]};
    const guide=[...streetRoute(start,first),...streetRoute(first,next).slice(1)];
    assert.ok(guide.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
    for(const turn of routeTurns(guide))assert.ok(ROADS.includes(turn.x)&&ROADS.includes(turn.z));
  }
});
test('checkpoint detection catches fast passes, including either road edge, but rejects misses',()=>{
  assert.equal(passedCheckpoint({x:-40,z:0},{x:40,z:0},{x:0,z:0}),true);
  assert.equal(passedCheckpoint({x:-40,z:12},{x:40,z:12},{x:0,z:0}),true);
  assert.equal(passedCheckpoint({x:-40,z:22},{x:40,z:22},{x:0,z:0}),false);
  assert.equal(passedCheckpoint({x:0,z:0},{x:0,z:0},{x:0,z:0}),true);
});
test('all cars reach faster normal speeds than their previous top speeds',()=>{
  const old=[38,46,43,57];
  for(let c=0;c<CARS.length;c++){
    const p=createPlayer();
    for(let i=0;i<120;i++)stepPlayer(p,{forward:true},CARS[c],1/60);
    assert.ok(p.speed>CARS[c].speed*.75,`${CARS[c].name} should accelerate briskly within two seconds`);
    for(let i=0;i<120;i++)stepPlayer(p,{forward:true},CARS[c],1/60);
    assert.ok(p.speed>old[c]*1.2,`${CARS[c].name} did not reach its increased speed`);
  }
});
