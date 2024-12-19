import {parseArgs} from 'node:util'

type OptionType = {
    [key: string]: {
        type: 'string' | 'boolean';
        short?: string;
    };
};
const options: OptionType = {
    'credential':{type: 'string', short: 'c'},
    'show-retries': {type: 'boolean'},
    'show-history': {type: 'boolean'},
    'keep-results': {type: 'boolean', short: 'r'},
    'keep-history': {type: 'boolean', short: 'h'},
};

export function main() {
    const args = parseArgs({args: process.argv, options: options});
    const noColor = args.values['no-color']

    console.log(noColor)

}