module.exports = function override(config) {
    config.ignoreWarnings = [
        { module: /react-datepicker/ },
        { module: /@mui/ }
    ];

    if (config.module?.rules) {
        config.module.rules.forEach(rule => {
            if (rule.use) {
                rule.use.forEach(u => {
                    if (u.options && u.options.baseConfig && u.options.baseConfig.rules) {
                        // Disable exhaustive-deps rule globally
                        u.options.baseConfig.rules["react-hooks/exhaustive-deps"] = "off";
                    }
                });
            }
        });
    }

    return config;
};
