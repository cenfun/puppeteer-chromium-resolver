module.exports = {
    //system globals
    "env": {
        "node": true,
        "browser": true,
        "amd": true,
        "commonjs": true,
        "es6": true,
        "jquery": true,
        "mocha": true
    },
    //other globals
    "globals": {
        "assert": true
    },

    "extends": [
        "eslint:recommended"
    ],

    //should "npm install eslint-plugin-es -g" for VSCode in global
    "plugins": [
        //"es"
    ],

    "root": true,

    "parserOptions": {
        //set to 3, 5 (default), 6, 7, 8, 9, or 10 to specify the version of ECMAScript syntax you want to use. 
        //2015 (same as 6), 2016 (same as 7), 2017 (same as 8), 2018 (same as 9), or 2019 (same as 10) to use the year-based naming.
        "ecmaVersion": 2018,
        "sourceType": "module"
    },


    //https://eslint.org/docs/4.0.0/rules/

    "rules": {
        "arrow-spacing": "error",
        "block-spacing": "error",
        "comma-dangle": ["error", "never"],
        "comma-spacing": ["error", {
            "after": true,
            "before": false
        }],
        "complexity": ["error", 8],
        "curly": "error",
        "dot-location": ["error", "property"],
        "dot-notation": "error",
        "eqeqeq": ["error", "always"],
        "func-call-spacing": ["error", "never"],
        "indent": ["error", 4, {
            "ArrayExpression": "first",
            "ObjectExpression": 1,
            "SwitchCase": 1
        }],
        "key-spacing": ["error", {
            "afterColon": true,
            "mode": "strict"
        }],
        "keyword-spacing": ["error", {
            "after": true,
            "before": true
        }],
        "line-comment-position": ["error", {
            "position": "above"
        }],
        "lines-around-comment": ["error", {
            "beforeBlockComment": true
        }],
        "lines-between-class-members": ["error", "always", {
            "exceptAfterSingleLine": true
        }],
        "max-depth": ["error", 4],
        "max-len": ["error", {
            "code": 550,
            "ignoreStrings": true,
            "ignoreTrailingComments": true
        }],
        "max-nested-callbacks": ["error", 3],
        "max-params": ["error", 8],
        "max-statements": ["error", 50],
        "new-cap": ["error", {
            "newIsCap": true,
            "capIsNew": false,
            "properties": true
        }],
        "no-alert": "error",
        "no-array-constructor": "error",
        "no-confusing-arrow": "error",
        "no-console": "off",
        "no-constant-condition": ["error", {
            "checkLoops": false
        }],
        "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
        "no-duplicate-imports": "error",
        "no-else-return": "error",
        "no-empty": "off",
        "no-eq-null": "error",
        "no-eval": "error",
        "no-floating-decimal": "error",
        "no-inline-comments": "error",
        "no-multi-assign": "error",
        "no-multi-spaces": "error",
        "no-multi-str": "error",
        "no-multiple-empty-lines": ["error", {
            "max": 2,
            "maxBOF": 1,
            "maxEOF": 1
        }],
        "no-nested-ternary": "warn",
        "no-new-object": "error",
        "no-param-reassign": "off",
        "no-prototype-builtins": "off",
        "no-restricted-globals": ["error", "event", "fdescribe"],
        "no-return-assign": "warn",
        //"no-return-await": "warn",
        "no-sequences": "error",
        "no-trailing-spaces": ["error", {
            "ignoreComments": true,
            "skipBlankLines": true
        }],
        "no-unneeded-ternary": "error",
        "no-unused-vars": ["error", {
            "args": "none",
            "vars": "local"
        }],
        "no-useless-return": "error",
        "no-var": ["warn"],
        "no-whitespace-before-property": "error",
        "no-with": "error",
        "object-curly-newline": ["error", {
            "ExportDeclaration": {
                "minProperties": 3,
                "multiline": true
            },
            "ImportDeclaration": {
                "minProperties": 3,
                "multiline": true
            },
            "ObjectExpression": {
                "minProperties": 1,
                "multiline": true
            },
            "ObjectPattern": {
                "minProperties": 3,
                "multiline": true
            }
        }],
        "object-curly-spacing": ["error", "always"],
        "object-property-newline": ["error", {
            "allowAllPropertiesOnSameLine": true
        }],
        "one-var": ["error", "never"],
        "operator-linebreak": ["error", "before"],
        "padding-line-between-statements": ["error", {
            "blankLine": "always",
            "next": "*",
            "prev": "directive"
        }, {
            "blankLine": "any",
            "next": "directive",
            "prev": "directive"
        }, {
            "blankLine": "always",
            "next": "function",
            "prev": "*"
        }, {
            "blankLine": "always",
            "next": "block",
            "prev": "*"
        }],
        "prefer-const": "error",
        //"prefer-template": "error",
        "quotes": ["error", "double", {
            "avoidEscape": true
        }],
        "require-atomic-updates": "off",
        //"require-await": "error",
        "rest-spread-spacing": ["error", "always"],
        "semi": ["error", "always"],
        "semi-spacing": ["error", {
            "after": true,
            "before": false
        }],
        "space-before-blocks": ["error", "always"],
        "space-before-function-paren": ["error", {
            "anonymous": "never",
            "named": "never",
            "asyncArrow": "always"
        }],
        "space-in-parens": "error",
        "space-infix-ops": ["error", {
            "int32Hint": false
        }],
        "template-curly-spacing": "error",
        "unicode-bom": "error"
    }
};
