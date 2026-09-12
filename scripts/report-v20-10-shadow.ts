import { V2010ShadowComparisonRecorder } from "../server/v20/V2010ShadowComparisonRecorder";

const recorder = new V2010ShadowComparisonRecorder(undefined, true);
const summary = recorder.summarize();

console.log(JSON.stringify(summary, null, 2));
