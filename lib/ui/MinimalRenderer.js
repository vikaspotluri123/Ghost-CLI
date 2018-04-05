'use strict';

const CLIRenderer = require('./renderer');

class MinimalRenderer extends CLIRenderer {


    constructor(tasks, options) {
        super(tasks, options)
    }

    /**
     * Subscribes to task events
     */
    subscribeToEvents() {
        this.tasks.forEach((task) => {
            task.subscribe((event) => {
                if (event.type === 'STATE' && (task.isCompleted() || task.isSkipped() || task.hasFailed())) {
                    this.spinner.stop();
                }
            });
        });
    }

};

module.exports = MinimalRenderer;
