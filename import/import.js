const fs = require('fs');
const path = require('path');
const masterdata = require('./masterdata.js');
const config = require('./config.json');

const helper = require('./helper.js');
helper.setVersion('1.0.0', '170', 'en');

// extractReslerianaData();

module.exports = {
	extractReslerianaData,
	extractReslerianaDataAll,
	parseMasterData
}

/**
 * 
 * @param {string} server 
 */
async function extractReslerianaData(server) {
	const languages = config.serverToLanguage[server];
    if (!languages) {
        console.log(`Invalid server ${server} provided to extractReslerianaData(). Must be one of: ${Object.keys(config.serverToLanguage).join(', ')}.`);
        return;
    }

	let first = true;
	for (const language of languages) {
		await masterdata.extractMasterData(server, language, first);
		first = false;
	}

	parseMasterData(languages);

	updateFileList(languages);
}

async function extractReslerianaDataAll() {
	for (const server of Object.keys(config.serverToLanguage)) {
		await extractReslerianaData(server);
	}
}

function parseMasterData(languages) {
	for (const lang of languages) {
		helper.setLang(lang);

		runExtractor('./parse/extractcharacter.js', 'parsed', 'character');
		runExtractor('./parse/extractmemoria.js', 'parsed', 'memoria');
		// runExtractor('./parse/extractquest.js', 'parsed', 'quest');
		runExtractor('./parse/extractmaterial.js', 'parsed', 'material');
	}
}

function runExtractor(extractor, dataset, file) {
	try {
		const extract = require(extractor);
		delete require.cache[require.resolve(extractor)]; // delete the require cache because im dumb
		helper.writeData(extract(), dataset, file);
	} catch (e) {
		if (e instanceof helper.DataNotFoundError) {
			console.log(e.message);
		} else {
			console.log(e);
		}
	}
}

function updateFileList(languages=config.languages) {
	const files = {};
	for (const dataset of ['master', 'parsed']) {
		files[dataset] = {};
		for (const language of languages) {
			if (fs.existsSync(path.resolve(__dirname, `../data/${dataset}/${language}`))) {
				files[dataset][language] = fs.readdirSync(path.resolve(__dirname, `../data/${dataset}/${language}`), { withFileTypes: true })
					.filter(item => !item.isDirectory())
					.map(f => f.name.substring(0, f.name.lastIndexOf('.')));
			}
		}
	}

	fs.mkdirSync(path.resolve(__dirname, `../data`), { recursive: true });
	fs.writeFileSync(path.resolve(__dirname, `../data/files.json`), JSON.stringify(files, null, '\t'));
}