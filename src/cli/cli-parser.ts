export interface CliOptions {
  goal?: string;
  outputPath?: string;
  testPath?: string;
  contextFiles?: string[];
}

export function parseCliArguments(argv: string[]): CliOptions {
    const options: CliOptions = {};
    const contextFiles: string[] = [];

    for (let i = 0; i < argv.length; i++) {
        const ar = argv[i];
        if(ar === "--goal" && i + 1 < argv.length) {
            options.goal = argv[i + 1];
            i++;
        } else if(ar === "--output" && i + 1 < argv.length) {
            options.outputPath = argv[i + 1];
            i++;
        } else if(ar === "--test" && i + 1 < argv.length) {
            options.testPath = argv[i + 1];
            i++;
        } else if(ar === "--context" && i + 1 < argv.length) {
            contextFiles.push(argv[i + 1]);
            i++;
        }
    }
    options.contextFiles = contextFiles;
    return options;
}
