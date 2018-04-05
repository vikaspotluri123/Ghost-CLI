'use strict';
const Command = require('../command');

class MigrateCommand extends Command {
    run(argv) {
        const parseNeededMigrations = require('../utils/needed-migrations');

        const instance = this.system.getInstance();
        let promise;

        if (argv.quiet) {
            promise = this.system.hook('migrations');
        } else {
            promise = this.ui.run(
                () => this.system.hook('migrations'),
                'Checking for available migrations'
            );
        }

        return promise.then((extensionMigrations) => {
            const neededMigrations = parseNeededMigrations(
                instance.cliConfig.get('cli-version'),
                this.system.cliVersion,
                extensionMigrations
            );

            if (!neededMigrations.length) {
                if (!argv.quiet) {
                    this.ui.log('No migrations needed :)', 'green');
                }

                return Promise.resolve();
            }

            const listrOpts = {instance: instance};

            if (argv.quiet) {
                listrOpts.renderer = require('../../ui/MinimalRenderer');
            }

            return Promise.resolve(this.ui.listr(neededMigrations, {instance: instance})).delay(100000);
        }).then(() => {
            // Update the cli version in the cli config file
            instance.cliConfig.set('cli-version', this.system.cliVersion).save();
        });
    }
}

MigrateCommand.description = 'Run system migrations on a Ghost instance';
MigrateCommand.checkVersion = true;

module.exports = MigrateCommand;
