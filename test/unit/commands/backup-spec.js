'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const fs = require('fs-extra');
const setupEnv = require('../../utils/env');
const Promise = require('bluebird');
const path = require('path');

const modulePath = '../../../lib/commands/backup';
const Instance = require('../../../lib/instance');

describe('Unit: Commands > Backup', function () {
    const envConfig = {
        dirs: ['content'],
        files: [{
            path: './.ghost-cli',
            content: {
                'cli-version': '1.1.1',
                'active-version': '1.8.0',
                name: 'ghost-local',
                'previous-version': '1.7.1'
            },
            json: true
        }, {
            path: './config.production.json',
            content: {
                test: 'true'
            },
            json: true
        }, {
            path: './content/nap.json',
            content: {
                itsreal: true
            },
            json: true
        }]
    };

    it('Saves to the right location', function (done) {
        this.timeout(3000);
        const env = setupEnv(envConfig);
        const dbbackupStub = sinon.stub().resolves({});
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const system = {getInstance: sinon.stub(), environment: 'production'};
        const fsstub = {
            readFileSync: sinon.stub(),
            ensureDirSync: fs.ensureDirSync,
            access: fs.access,
            W_OK: fs.W_OK
        };

        fsstub.readFileSync.callsFake((location) => {
            return fs.readFileSync(path.join(env.dir, location));
        });

        const datetime = (new Date()).toJSON().substring(0, 10);

        const ui = {log: sinon.stub(), listr: sinon.stub()};
        ui.listr.callsFake((tasks, ctx) => {
            return Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx)) {
                    return;
                }

                return task.task(ctx);
            });
        });

        const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');

        const BackupCommand = proxyquire(modulePath, {
            [exporterLocation]: {
                doExport: dbbackupStub
            },
            'fs-extra': fsstub
        });

        const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
        system.getInstance.returns(fakeInstance);
        fakeInstance.running.returns(false);
        fakeInstance.name = 'ghoster'

        const backup = new BackupCommand(ui,system);

        backup.run({}).then(() => {
            cwdStub.restore();
            expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.true;
            expect(ui.listr.calledTwice).to.be.true;
            expect(ui.log.called).to.be.false;
            env.cleanup();
            done();
        });
    });

    it('Warns of running instance', function (done) {
        const env = setupEnv(envConfig);
        const dbbackupStub = sinon.stub().resolves({});
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const system = {getInstance: sinon.stub(), environment: 'production'};
        const fsstub = {
            readFileSync: sinon.stub(),
            ensureDirSync: fs.ensureDirSync,
            access: fs.access,
            W_OK: fs.W_OK
        };

        fsstub.readFileSync.callsFake((location) => {
            return fs.readFileSync(path.join(env.dir, location));
        });

        const datetime = (new Date()).toJSON().substring(0, 10);

        const ui = {log: sinon.stub(), listr: sinon.stub()};
        ui.listr.callsFake((tasks, ctx) => {
            return Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx)) {
                    return;
                }

                return task.task(ctx);
            });
        });

        const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');

        const BackupCommand = proxyquire(modulePath, {
            [exporterLocation]: {
                doExport: dbbackupStub
            },
            'fs-extra': fsstub
        });

        const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
        system.getInstance.returns(fakeInstance);
        fakeInstance.running.returns(true);
        fakeInstance.name = 'ghoster'

        const backup = new BackupCommand(ui,system);

        backup.run({}).then(() => {
            cwdStub.restore();
            expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.true;
            expect(ui.listr.calledTwice).to.be.true;
            expect(ui.log.calledOnce).to.be.true;
            env.cleanup();
            done();
        });
    });

    it('Complains about write permissions', function (done) {
        const env = setupEnv(envConfig);
        const dbbackupStub = sinon.stub().resolves({});
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const system = {getInstance: sinon.stub(), environment: 'production'};
        const fsstub = {
            readFileSync: sinon.stub(),
            access: sinon.stub().throws(new Error()),
            ensureDirSync: sinon.stub().throws(new Error()),
            W_OK: fs.W_OK
        };

        fsstub.readFileSync.callsFake((location) => {
            return fs.readFileSync(path.join(env.dir, location));
        });

        const datetime = (new Date()).toJSON().substring(0, 10);

        const ui = {log: sinon.stub(), listr: sinon.stub()};
        ui.listr.callsFake((tasks, ctx) => {
            return Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx)) {
                    return;
                }

                return task.task(ctx);
            });
        });

        const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');

        const BackupCommand = proxyquire(modulePath, {
            [exporterLocation]: {
                doExport: dbbackupStub
            },
            'fs-extra': fsstub
        });

        const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
        system.getInstance.returns(fakeInstance);
        fakeInstance.running.returns(true);
        fakeInstance.name = 'ghoster'

        const backup = new BackupCommand(ui,system);

        backup.run({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch(() => {
            cwdStub.restore();
            expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
            expect(ui.listr.calledOnce).to.be.true;
            expect(ui.log.calledOnce).to.be.true;
            env.cleanup();
            done();
        });
    });

    it('Errors on MYSQL connection failure', function (done) {
        const mysqlError = new Error('You\'ve been ghosted!');
        mysqlError.code = 'ECONNREFUSED';
        const env = setupEnv(envConfig);
        const dbbackupStub = sinon.stub().rejects(mysqlError);
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const system = {getInstance: sinon.stub(), environment: 'production'};
        const fsstub = {
            readFileSync: sinon.stub(),
            access: fs.access,
            ensureDirSync: fs.ensureDirSync,
            W_OK: fs.W_OK
        };

        fsstub.readFileSync.callsFake((location) => {
            return fs.readFileSync(path.join(env.dir, location));
        });

        const datetime = (new Date()).toJSON().substring(0, 10);

        const ui = {log: sinon.stub(), listr: sinon.stub()};
        ui.listr.callsFake((tasks, ctx) => {
            return Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx)) {
                    return;
                }

                return task.task(ctx);
            });
        });

        const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');

        const BackupCommand = proxyquire(modulePath, {
            [exporterLocation]: {
                doExport: dbbackupStub
            },
            'fs-extra': fsstub
        });

        const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
        system.getInstance.returns(fakeInstance);
        fakeInstance.running.returns(false);
        fakeInstance.name = 'ghoster'

        const backup = new BackupCommand(ui,system);

        backup.run({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            cwdStub.restore();
            expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
            expect(ui.listr.calledTwice).to.be.true;
            expect(ui.log.called).to.be.false;
            expect(error.message).to.match(/Unable to connect to MySQL/);
            env.cleanup();
            done();
        });
    });

    it('Fails on unknown export failure', function (done) {
        const env = setupEnv(envConfig);
        const dbbackupStub = sinon.stub().rejects(new Error('What even is backing up'));
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const system = {getInstance: sinon.stub(), environment: 'production'};
        const fsstub = {
            readFileSync: sinon.stub(),
            access: fs.access,
            ensureDirSync: fs.ensureDirSync,
            W_OK: fs.W_OK
        };

        fsstub.readFileSync.callsFake((location) => {
            return fs.readFileSync(path.join(env.dir, location));
        });

        const datetime = (new Date()).toJSON().substring(0, 10);

        const ui = {log: sinon.stub(), listr: sinon.stub()};
        ui.listr.callsFake((tasks, ctx) => {
            return Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx)) {
                    return;
                }

                return task.task(ctx);
            });
        });

        const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');

        const BackupCommand = proxyquire(modulePath, {
            [exporterLocation]: {
                doExport: dbbackupStub
            },
            'fs-extra': fsstub
        });

        const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
        system.getInstance.returns(fakeInstance);
        fakeInstance.running.returns(false);
        fakeInstance.name = 'ghoster'

        const backup = new BackupCommand(ui,system);

        backup.run({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            cwdStub.restore();
            expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
            expect(ui.listr.calledTwice).to.be.true;
            expect(ui.log.called).to.be.false;
            expect(error.message).to.match(/What even is backing up/);
            env.cleanup();
            done();
        });
    })

    it('Accepts the output flag', function (done) {
        const env = setupEnv(envConfig);
        const dbbackupStub = sinon.stub().resolves({});
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const system = {getInstance: sinon.stub(), environment: 'production'};
        const fsstub = {
            readFileSync: sinon.stub(),
            ensureDirSync: fs.ensureDirSync,
            access: fs.access,
            W_OK: fs.W_OK
        };

        fsstub.readFileSync.callsFake((location) => {
            return fs.readFileSync(path.join(env.dir, location));
        });

        const datetime = (new Date()).toJSON().substring(0, 10);

        const ui = {log: sinon.stub(), listr: sinon.stub()};
        ui.listr.callsFake((tasks, ctx) => {
            return Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx)) {
                    return;
                }

                return task.task(ctx);
            });
        });

        const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');

        const BackupCommand = proxyquire(modulePath, {
            [exporterLocation]: {
                doExport: dbbackupStub
            },
            'fs-extra': fsstub
        });

        const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
        system.getInstance.returns(fakeInstance);
        fakeInstance.running.returns(false);
        fakeInstance.name = 'ghoster'

        const backup = new BackupCommand(ui,system);

        backup.run({output: './a'}).then(() => {
            cwdStub.restore();
            expect(fs.existsSync(path.join(env.dir, `a/ghoster.backup.${datetime}.zip`))).to.be.true;
            expect(ui.listr.calledTwice).to.be.true;
            expect(ui.log.called).to.be.false;
            env.cleanup();
            done();
        });
    });

    it('Fails when the exporter doesn\'t load', function (done) {
        const env = setupEnv(envConfig);
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const system = {getInstance: sinon.stub(), environment: 'production'};
        const fsstub = {
            readFileSync: sinon.stub(),
            ensureDirSync: fs.ensureDirSync,
            access: fs.access,
            W_OK: fs.W_OK
        };

        fsstub.readFileSync.callsFake((location) => {
            return fs.readFileSync(path.join(env.dir, location));
        });

        const datetime = (new Date()).toJSON().substring(0, 10);

        const ui = {log: sinon.stub(), listr: sinon.stub()};
        ui.listr.callsFake((tasks, ctx) => {
            return Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx)) {
                    return;
                }

                return task.task(ctx);
            });
        });

        const BackupCommand = proxyquire(modulePath, {
            'fs-extra': fsstub
        });

        const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
        system.getInstance.returns(fakeInstance);
        fakeInstance.running.returns(false);
        fakeInstance.name = 'ghoster'

        const backup = new BackupCommand(ui,system);

        backup.run({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) =>{
            cwdStub.restore();
            // @todo: figure out why this returns true
            expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
            expect(ui.listr.calledTwice).to.be.true;
            expect(ui.log.called).to.be.false;
            expect(error.message).to.match(/Unable to initialize database exporter/)
            env.cleanup();
            done();
        });
    });

    it('Fails if core files can\'t be read', function (done) {
        const env = setupEnv(envConfig);
        const dbbackupStub = sinon.stub().resolves({});
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const system = {getInstance: sinon.stub(), environment: 'production'};
        const fsstub = {
            readFileSync: sinon.stub().throws(new Error('File doesn\'t exist')),
            ensureDirSync: fs.ensureDirSync,
            access: fs.access,
            W_OK: fs.W_OK
        };

        const datetime = (new Date()).toJSON().substring(0, 10);

        const ui = {log: sinon.stub(), listr: sinon.stub()};
        ui.listr.callsFake((tasks, ctx) => {
            return Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx)) {
                    return;
                }

                return task.task(ctx);
            });
        });

        const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');

        const BackupCommand = proxyquire(modulePath, {
            [exporterLocation]: {
                doExport: dbbackupStub
            },
            'fs-extra': fsstub
        });

        const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
        system.getInstance.returns(fakeInstance);
        fakeInstance.running.returns(false);
        fakeInstance.name = 'ghoster'

        const backup = new BackupCommand(ui,system);

        backup.run({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            cwdStub.restore();
            expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
            expect(ui.listr.calledTwice).to.be.true;
            expect(ui.log.called).to.be.false;
            expect(error.message).to.match(/Failed to create zip file/);
            env.cleanup();
            done();
        });
    });

    it('Fails if content folder can\'t be read', function (done) {
        const env = setupEnv({
            files: [{
                path: './.ghost-cli',
                content: {
                    'cli-version': '1.1.1',
                    'active-version': '1.8.0',
                    name: 'ghost-local',
                    'previous-version': '1.7.1'
                },
                json: true
            }, {
                path: './config.production.json',
                content: {
                    test: 'true'
                },
                json: true
            }]
        });
        const dbbackupStub = sinon.stub().resolves({});
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const system = {getInstance: sinon.stub(), environment: 'production'};
        const fsstub = {
            readFileSync: sinon.stub(),
            ensureDirSync: fs.ensureDirSync,
            access: fs.access,
            W_OK: fs.W_OK
        };

        fsstub.readFileSync.callsFake((location) => {
            return fs.readFileSync(path.join(env.dir, location));
        });

        const datetime = (new Date()).toJSON().substring(0, 10);

        const ui = {log: sinon.stub(), listr: sinon.stub()};
        ui.listr.callsFake((tasks, ctx) => {
            return Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx)) {
                    return;
                }

                return task.task(ctx);
            });
        });

        const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');

        const BackupCommand = proxyquire(modulePath, {
            [exporterLocation]: {
                doExport: dbbackupStub
            },
            'fs-extra': fsstub
        });

        const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
        system.getInstance.returns(fakeInstance);
        fakeInstance.running.returns(false);
        fakeInstance.name = 'ghoster'

        const backup = new BackupCommand(ui,system);

        backup.run({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            cwdStub.restore();
            expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
            expect(ui.listr.calledTwice).to.be.true;
            expect(ui.log.called).to.be.false;
            expect(error.message).to.match(/Failed to read content folder/);
            env.cleanup();
            done();
        });
    });

    it('Links in content folder are skipped but user is notified', function (done) {
        const env = setupEnv({
            dirs: ['content','linker'],
            links: [['linker','content/casper']],
            files: [{
                path: './.ghost-cli',
                content: {
                    'cli-version': '1.1.1',
                    'active-version': '1.8.0',
                    name: 'ghost-local',
                    'previous-version': '1.7.1'
                },
                json: true
            }, {
                path: './config.production.json',
                content: {
                    test: 'true'
                },
                json: true
            }, {
                path: './content/nap.json',
                content: {
                    isreal: true
                },
                json: true
            }]
        });
        const dbbackupStub = sinon.stub().resolves({});
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const system = {getInstance: sinon.stub(), environment: 'production'};
        const fsstub = {
            readFileSync: sinon.stub(),
            ensureDirSync: fs.ensureDirSync,
            access: fs.access,
            W_OK: fs.W_OK
        };

        fsstub.readFileSync.callsFake((location) => {
            return fs.readFileSync(path.join(env.dir, location));
        });

        const datetime = (new Date()).toJSON().substring(0, 10);

        const ui = {log: sinon.stub(), listr: sinon.stub()};
        ui.listr.callsFake((tasks, ctx) => {
            return Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx)) {
                    return;
                }

                return task.task(ctx);
            });
        });

        const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');

        const BackupCommand = proxyquire(modulePath, {
            [exporterLocation]: {
                doExport: dbbackupStub
            },
            'fs-extra': fsstub
        });

        const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
        system.getInstance.returns(fakeInstance);
        fakeInstance.running.returns(false);
        fakeInstance.name = 'ghoster'

        const backup = new BackupCommand(ui,system);

        backup.run({}).then(() => {
            cwdStub.restore();
            expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.true;
            expect(ui.listr.calledTwice).to.be.true;
            expect(ui.log.calledOnce).to.be.true;
            env.cleanup();
            done();
        });
    });
});
