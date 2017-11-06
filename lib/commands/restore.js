'use strict';
const Command = require('../command');

class RestoreCommand extends Command {
    run() {

    }
}

RestoreCommand.description = 'Restore ghost from a backup';
RestoreCommand.longDescription = 'Restores a Ghost installation that was backed up using the `backup` CLI command';

module.exports = RestoreCommand;
