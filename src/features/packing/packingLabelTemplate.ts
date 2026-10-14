export interface LabelTemplate { width:number; height:number; fontSize:number; materials:boolean }
export const defaultLabelTemplate:LabelTemplate={width:100,height:80,fontSize:9,materials:true};
export function validateLabelTemplate(value:unknown):LabelTemplate {
  if(!value || typeof value!=="object")throw new Error("Label layout required");
  const t=value as LabelTemplate;
  if(![t.width,t.height,t.fontSize].every(Number.isFinite)||t.width<90||t.width>210||t.height<80||t.height>297||t.fontSize<7||t.fontSize>12||typeof t.materials!=="boolean")throw new Error("Label width 90–210 mm, height 80–297 mm and font 7–12 pt required");
  return {width:t.width,height:t.height,fontSize:t.fontSize,materials:t.materials};
}
