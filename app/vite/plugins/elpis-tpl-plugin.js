const fs = require('fs');
const path = require('path');

const DEV = 'http://127.0.0.1:9002';

function toEntryModulePath(absPath) {
	const rel = path.relative(process.cwd(), absPath).split(path.sep).join('/');
	if (rel.startsWith('..')) {
		const fsPath = path.resolve(absPath).split(path.sep).join('/');
		return `/@fs${fsPath.startsWith('/') ? fsPath : `/${fsPath}`}`;
	}
	return `/${rel}`;
}

function writeDevTpls(allEntries) {
	const templatePath = path.resolve(__dirname, '../../view/entry.tpl');
	const template = fs.readFileSync(templatePath, 'utf-8');
	const destDir = path.resolve(process.cwd(), './app/public/dist');
	fs.mkdirSync(destDir, { recursive: true });

	Object.entries(allEntries).forEach(([entryName, absPath]) => {
		const entryModulePath = toEntryModulePath(absPath);
		const scripts = [
			`<script type="module" src="${DEV}/@vite/client"></script>`,
			`<script type="module" src="${DEV}${entryModulePath}"></script>`
		].join('\n\t');
		const html = template.replace('</body>', `\t${scripts}\n</body>`);
		fs.writeFileSync(path.join(destDir, `${entryName}.tpl`), html);
	});
}

function findEntryChunk(bundle, entryName, absPath) {
	return Object.values(bundle).find((item) => {
		if (item.type !== 'chunk' || !item.isEntry) {
			return false;
		}
		if (item.name === entryName) {
			return true;
		}
		if (absPath && item.facadeModuleId && path.resolve(item.facadeModuleId) === path.resolve(absPath)) {
			return true;
		}
		return false;
	});
}

function collectImportedCss(chunk) {
	const css = [];
	const importedCss = chunk.viteMetadata && chunk.viteMetadata.importedCss;
	if (importedCss) {
		importedCss.forEach((fileName) => css.push(fileName));
	}
	return css;
}

function collectEntryAssets(bundle, entryChunk) {
	const js = [];
	const css = [];
	const visited = new Set();

	function walk(chunk) {
		if (!chunk || chunk.type !== 'chunk' || visited.has(chunk.fileName)) {
			return;
		}
		visited.add(chunk.fileName);
		(chunk.imports || []).forEach((fileName) => {
			const imported = bundle[fileName];
			if (imported && imported.type === 'chunk') {
				walk(imported);
			} else if (String(fileName).endsWith('.css')) {
				css.push(fileName);
			}
		});
		collectImportedCss(chunk).forEach((fileName) => css.push(fileName));
		js.push(chunk.fileName);
	}

	walk(entryChunk);

	if (css.length === 0) {
		const chunkBases = js.map((fileName) => path.basename(fileName, '.js').replace(/-[^./]+$/, ''));
		Object.values(bundle).forEach((item) => {
			if (item.type !== 'asset' || !item.fileName.endsWith('.css')) {
				return;
			}
			const cssBase = path.basename(item.fileName, '.css').replace(/-[^./]+$/, '');
			if (chunkBases.some((name) => cssBase === name || name.startsWith(cssBase))) {
				css.push(item.fileName);
			}
		});
	}

	return {
		js,
		css: Array.from(new Set(css))
	};
}

function writeProdTpls(allEntries, bundle) {
	const templatePath = path.resolve(__dirname, '../../view/entry.tpl');
	const template = fs.readFileSync(templatePath, 'utf-8');
	const destDir = path.resolve(process.cwd(), './app/public/dist');
	fs.mkdirSync(destDir, { recursive: true });

	Object.entries(allEntries).forEach(([entryName, absPath]) => {
		const entryChunk = findEntryChunk(bundle, entryName, absPath);
		if (!entryChunk) {
			return;
		}
		const { js, css } = collectEntryAssets(bundle, entryChunk);
		const links = css.map((fileName) => (
			`<link rel="stylesheet" href="/dist/prod/${fileName}">`
		));
		const scripts = js.map((fileName) => (
			`<script type="module" src="/dist/prod/${fileName}" crossorigin></script>`
		));
		let html = template;
		if (links.length) {
			html = html.replace('</head>', `\t${links.join('\n\t')}\n</head>`);
		}
		html = html.replace('</body>', `\t${scripts.join('\n\t')}\n</body>`);
		fs.writeFileSync(path.join(destDir, `${entryName}.tpl`), html);
	});
}

module.exports = function elpisTplPlugin() {
	return {
		name: 'elpis-tpl-plugin',
		configureServer() {
			const { allEntries } = require('../config/vite.base.js');
			writeDevTpls(allEntries);
			return;
		},
		generateBundle(options, bundle) {
			const { allEntries } = require('../config/vite.base.js');
			writeProdTpls(allEntries, bundle);
		}
	};
};
