// Exercises every supported TypeScript to Fish mapping.
export const DEMO_SOURCE = `
declare function test_func(): void;

// --- Variables & Arrays ---
const name: string = "world";
const items: string[] = ["apple", "banana", "cherry"];
const first: string = items[0];
const item_count: number = items.length;

// --- String concatenation ---
const greeting: string = "Hello, " + name + "!";

// --- Template literals ---
const tpl: string = \`You have \${item_count} items: \${first}\`;

// --- Arithmetic ---
const total: number = item_count + 1;

// --- If / else if / else ---
if (item_count > 2) {
    echo("many");
} else if (item_count === 1) {
    echo("one");
} else {
    echo("some");
}

// --- For...of loop ---
for (const item of items) {
    echo(item);
}

// --- Classic for loop ---
for (let i: number = 0; i < 3; i++) {
    echo(i);
}

// --- While loop ---
let n: number = 3;
while (n > 0) {
    echo(n);
    n = n - 1;
}

// --- Switch ---
switch (name) {
    case "world":
        echo("hello world");
        break;
    default:
        echo("unknown");
}

// --- Functions ---
function greet(who: string): void {
    echo("Hello, " + who);
    return;
}
greet(name);

// --- Try / catch ---
try {
    echo("trying");
} catch (e) {
    echo("caught");
}

// --- Compound assignment ---
let counter: number = 0;
counter += 5;
counter -= 2;
echo(counter);
`;
