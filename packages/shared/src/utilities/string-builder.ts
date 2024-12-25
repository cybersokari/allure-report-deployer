export class StringBuilder {
    private strings: string[] = [];

    append(value: string): StringBuilder {
        this.strings.push(value);
        return this;
    }

    values() {return this.strings}

    toString(): string {
        return this.strings.join('');
    }

    clear(): void {
        this.strings = [];
    }
}