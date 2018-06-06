'use strict';
const UI = require('./index');
const ora = require('ora');
const chalk = require('chalk');
const println = require('log-update');
//const println = console.log.bind(console);
const symbols = require('log-symbols');

const defaultOptions = {
    refreshRate: 100
};

/**
 * Renderer class used for Listr lists. Adds some integration with the UI
 * class so that prompt and noSpin calls still work
 *
 * @class CLIRenderer
 */
class CLIRenderer {
    /**
     * Creates the renderer
     * @param {Array} tasks Tasks array
     * @param {Object} options Options
     */
    constructor(tasks, options) {
        this.tasks = (tasks || []).filter((task) => task.isEnabled());
        this.options = Object.assign({}, defaultOptions, options);

        this.ui = this.constructor.ui || new UI();
        this.output = [];
    }

    /**
     * Do the render
     */
    render() {
        if (this.id) {
            return;
        }

        this.spinner = this.ui.spinner = ora({
            stream: this.ui.stdout,
            spinner: this.options.spinner || 'hamburger'
        });

        this.subscribeToEvents();

        this.id = setInterval(() => {
            this.frame();
        }, this.options.refreshRate);
    }

    /**
     * Subscribes to task events
     */
    subscribeToEvents() {
        this.tasks.forEach((task) => {
            task.subscribe((event) => {
                if (event.type === 'STATE' && (task.isCompleted() || task.isSkipped() || task.hasFailed())) {
                    const symbol = task.isCompleted() ? 'success' : (task.isSkipped() ? 'info' : 'error');
                    const taskText = task.isSkipped() ? `${task.title} ${chalk.gray('[skipped]')}` : task.title;
                    this.output.push(`${symbols[symbol]} ${taskText}`);
                    println(this.output.join('\n'));
                }
            });
        });
    }

    /**
     * Renders a frame of output. Updates spinner text
     */
    frame() {
        const text = this.tasks
            .filter((task) => task.isPending())
            .map(this.buildText.bind(this)).join(' | ');

        if (!this.spinner.paused) {
            const frame = this.spinner.frame();
            this.output.push(`${frame}${text}`);
            println(this.output.join('\n'));
            this.output.pop();
        }
    }

    /**
     * Builds the spinner text for a given task
     * @param {Task} task
     */
    buildText(task) {
        if (!task.hasSubtasks()) {
            if (task.output && typeof task.output === 'string') {
                const data = task.output.trim().split('\n').pop();
                return `${task.title} ${this.constructor.separator} ${chalk.gray(data)}`;
            }

            return task.title;
        }

        const subtaskText = task.subtasks
            .filter((subtask) => subtask.isPending())
            .map((subtask) => this.buildText(subtask))
            .join('/');

        return `${task.title} ${this.constructor.separator} ${subtaskText}`;
    }

    /**
     * Called once all tasks have finished or one has errored.
     * Handles cleanup
     */
    end() {
        if (this.id) {
            clearInterval(this.id);
            this.id = undefined;
        }

        if (this.spinner) {
            this.spinner.stop();
            this.spinner = this.ui.spinner = null;
        }
    }
}

// Thing that separates tasks from subtasks
CLIRenderer.separator = chalk.cyan('>');

module.exports = CLIRenderer;
