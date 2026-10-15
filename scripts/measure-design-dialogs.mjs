// Optional evaluation only: npm install react-aria-components@1.22.1 --no-save --package-lock=false
import { build, version } from "esbuild";
import { gzipSync } from "node:zlib";

const samples = {
  radix: `import React from 'react'; import * as D from '@radix-ui/react-dialog';
    export default function Sample(){return <D.Root><D.Trigger>Open</D.Trigger><D.Portal><D.Overlay/><D.Content><D.Title>Review</D.Title><D.Description>Local draft</D.Description><D.Close>Close</D.Close></D.Content></D.Portal></D.Root>}`,
  aria: `import React from 'react'; import {DialogTrigger,Button,Modal,Dialog,Heading,Text} from 'react-aria-components';
    export default function Sample(){return <DialogTrigger><Button>Open</Button><Modal><Dialog><Heading slot="title">Review</Heading><Text slot="description">Local draft</Text><Button slot="close">Close</Button></Dialog></Modal></DialogTrigger>}`,
};
for (const [library, contents] of Object.entries(samples)) {
  const result = await build({
    stdin: { contents, loader: "jsx", resolveDir: process.cwd() },
    bundle: true,
    write: false,
    minify: true,
    format: "esm",
    target: "es2022",
    external: ["react", "react-dom", "react/jsx-runtime"],
    logLevel: "silent",
  });
  const bytes = result.outputFiles[0].contents;
  console.log(
    JSON.stringify({
      library,
      esbuild: version,
      minifiedBytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
    }),
  );
}
