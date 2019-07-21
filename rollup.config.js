import typescript from 'rollup-plugin-typescript';

export default {
    input: './src/Cannon.ts',
    output: {
        format: "es",
        file: "./build/cannon.js",
        name: "CANNON"
    },
    plugins: [
        typescript()
    ]
}