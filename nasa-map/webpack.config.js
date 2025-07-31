// webpack.config.js
module.exports = {
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: "pre",
                use: ["source-map-loader"],
                exclude: /node_modules\/react-datepicker/, // ignore these warnings
            },
        ],
    },
    ignoreWarnings: [/Failed to parse source map/], // Webpack 5+
};
