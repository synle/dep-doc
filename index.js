//external
require('console.table'); //npm install console.table
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

// var Q = require('q');

//internal
var aliases; //alias
try {
    aliases = require('./package.json').aliasify.aliases;
} catch (e) {
    aliases = {};
}

//var
var depMap = {}; //from to


var intialPath = './js/gmail-app';


var ResultMap = {
    depsWithJsExtension: [], //array of [filename, requireUsed]
    dupDeps: [],
};

var aliasMap = {}; //alias to full path


//get a list of all available js file
function scanFile(dir, res) {
    var dirs = fs.readdirSync(dir);
    var res = res || {};

    var dirs = fs.readdirSync(dir);
    for (var i = 0; i < dirs.length; i++) {
        var newDir = './' + path.join(dir, dirs[i]);

        if (fs.lstatSync(newDir).isDirectory()) {
            scanFile(newDir, res);
        } else {
            var extension = path.extname(newDir);

            if (extension === '.js' && newDir.indexOf('spec.js') === -1) {
                res[_trimJsExtension(newDir)] = {
                    fullPath: path.join(__dirname, newDir),
                    shortPath: _trimJsExtension(newDir),
                    myAlias: _.reduce(getAliasPath(newDir), function(r, v) {
                        var shortV = _trimJsExtension(v);
                        r[shortV] = true; //convert it to a map for easier look up
                        aliasMap[shortV] = _trimJsExtension(newDir);
                        return r
                    }, {}),
                    dependOn: _.reduce(getDeps(newDir), function(r, v) {
                        r.push(_trimJsExtension(v));
                        return r;
                    }, []),
                };
            }
        }
    }
}

//detect cycle
function scanCycle(res, cycleMap) {
    cycleMap = cycleMap || {};

    var pathKeys = []; //list of file1, file2,etc
    var pathKeyIndexMap = {}; //reverse map file1 -> index in the array
    _.each(res, function(v, k) {
        pathKeyIndexMap[k] = pathKeys.length;
        pathKeys.push(k);
    });

    var cycleMat = []; //cycle matrix
    for (var i = 0; i < pathKeys.length; i++) {
        cycleMat.push(_.times(cycleMat.length, _.constant(0)));
    }


    //put the value in for the cycle
    _.each(res, function(v, dir) {
        _.each(v.dependOn, function(dependOn) {
            var resolvedDependOn = aliasMap[dependOn];
            // console.log(dir, dependOn, resolvedDependOn)
        });
    });

    console.log(res);
}

//look at the content of the file and extract all requires
function getDeps(newDir) {
    var content = fs.readFileSync(newDir, 'utf8'); //read the content of the file.
    var deps;
    var requiresMatches = content.match(/require\([^)]+\)/g) || [];
    if (requiresMatches) {
        requiresMatches = _.map(requiresMatches, function(v) {
            var shortenedRequirePath = v.substr(9, v.length - 11);

            if (shortenedRequirePath.indexOf('.js') >= 0) {
                ResultMap.depsWithJsExtension.push([newDir, shortenedRequirePath]);

                //remove the .js
                shortenedRequirePath = _trimJsExtension(shortenedRequirePath);
            }

            return shortenedRequirePath;
        });

        requiresMatches = requiresMatches.sort();

        //figure the duplicate map
        var countMap = {};
        _.each(requiresMatches, function(v) {
            countMap[v] = countMap[v] || 0;
            countMap[v]++;
        });

        _.each(countMap, function(k, v) {
            if (v > 0) {
                ResultMap.dupDeps.push([newDir, k, v]);
            }
        });
    }


    return requiresMatches;
}

function _trimJsExtension(fileName) {
    if (fileName.indexOf('.js') >= 0) {
        return fileName.substr(0, fileName.length - 3);
    }

    return fileName
}


//convert ./js/awesome-app/ControlPanel to an array of qualified alias name : [@awesome-app/ControlPanel]
function getAliasPath(dir) {
    var possibleMatchingAliases = [];
    for (var k in aliases) {
        var v = aliases[k];

        if (dir.indexOf(v) === 0) {
            possibleMatchingAliases.push(dir.replace(v, k));
        }
    }
    return possibleMatchingAliases;
}



//convert @awesome-app/ControlPanel to ./js/awesome-app/ControlPanel
function getResolvedPath(aliasDir) {
    for (var k in aliases) {
        var v = aliases[k];

        if (aliasDir.indexOf(k) === 0) {
            return aliasDir.replace(k, v);
        }
    }

    return aliasDir;
}


//print the table
function printResultRow(results, header) {
    console.log('TOTAL: ', results.length);
    console.table(header, results);
    // _.each(results, function(v) {
    //     console.log(v.join(' - '))
    // });
}

//print separator
function printSectionDivder() {
    console.log('\n\n============================\n');
}

var res = {};
scanFile(intialPath, res);


var cycleMap = {};
scanCycle(res, cycleMap);

// console.log('WARNING: REQUIRES CONTAINING .JS');
// printResultRow(ResultMap.depsWithJsExtension, ['File', 'Requires']);


// printSectionDivder();
// console.log('WARNING: DUPLICATE REQUIRES');
// printResultRow(ResultMap.dupDeps, ['File', 'Requires', 'Count']);
// console.log(res);
