module.exports = function(grunt) {
  "use strict";

  grunt.initConfig({
    ts: {
      app: {
        files: [{
          src: ["src/\*\*/\*.ts", "!src/.baseDir.ts", "!src/_all.d.ts"],
          dest: "dist"
        }],
        options: {
          "target": "es6",
          "module": "commonjs",
          "outDir": "dist",
          "emitDecoratorMetadata": true,
          "experimentalDecorators": true,
          "lib": [
            "es6",
            "dom"
          ]
        }
      }
    },
    tslint: {
      options: {
        configuration: "tslint.json"
      },
      files: {
        src: ["src/\*\*/\*.ts"]
      }
    },
    watch: {
      ts: {
        files: ["src/\*\*/\*.ts"],
        tasks: ["ts", "tslint"]
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-ts");
  grunt.loadNpmTasks("grunt-tslint");

  grunt.registerTask("default", [
    "tslint",
    "ts"
  ]);

};
