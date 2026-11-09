// Preserve collection types used for one-hit hazards across room eviction.
// Legacy plain checkpoints are accepted too.
export function encodeCheckpoint(value) {
  return JSON.parse(JSON.stringify(value,(_key,item)=>
    typeof item==='number'&&!Number.isFinite(item)?{$number:String(item)}:
    item instanceof Set?{$collection:'set',values:[...item]}:
    item instanceof Map?{$collection:'map',values:[...item]}:item));
}
export function decodeCheckpoint(value) {
  return JSON.parse(JSON.stringify(value),(_key,item)=>{
    if(item?.$number==='Infinity')return Infinity;
    if(item?.$number==='-Infinity')return -Infinity;
    if(item?.$number==='NaN')return NaN;
    if(item?.$collection==='set'&&Array.isArray(item.values))return new Set(item.values);
    if(item?.$collection==='map'&&Array.isArray(item.values))return new Map(item.values);
    return item;
  });
}
