import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';

import { TextField } from '@mui/material';

import I18n from './wrapper/i18n';

import ConfigGeneric from './ConfigGeneric';

const styles = () => ({
    indeterminate: {
        opacity: 0.5,
    },
    control: {
        flexDirection: 'row',
        width: '100%',
    },
    warning: {
        '& .Mui-error': {
            color: 'orange',
        },
    },
});

class ConfigPort extends ConfigGeneric {
    componentDidMount() {
        super.componentDidMount();
        let _value = ConfigGeneric.getValue(this.props.data, this.props.attr);
        if (_value === null || _value === undefined) {
            _value = '';
        }
        this.setState({ _value: _value.toString(), oldValue: _value.toString() });

        // read all instances
        this.props.socket.getAdapterInstances()
            .then(instances => {
                const ownId = `system.adapter.${this.props.adapterName}.${this.props.instance}`;
                const ports = [];
                instances
                    .forEach(instance => {
                        // ignore own instance
                        if (instance._id === ownId) {
                            return;
                        }
                        // if letsencrypt is enabled and update is enabled, then add port to check
                        if (instance?.native &&
                            instance.native.secure &&
                            instance.native.leEnabled &&
                            instance.native.leUpdate
                        ) {
                            const port = parseInt(instance.native.leCheckPort || instance.native.lePort, 10);
                            port && ports.push({
                                name: `${instance._id.replace('system.adapter.', '')} (LE)`,
                                port,
                                enabled: instance.common?.enabled,
                            });
                        }

                        const port = parseInt(instance?.native?.port, 10);
                        if (port) {
                            ports.push({
                                name: instance._id.replace('system.adapter.', ''),
                                port,
                                enabled: instance.common?.enabled,
                            });
                        }
                        return null;
                    });
                this.setState({ ports });
            });
    }

    static getDerivedStateFromProps(props, state) {
        const _value = ConfigGeneric.getValue(props.data, props.attr);
        if (_value === null || _value === undefined ||
            state.oldValue === null || state.oldValue === undefined ||
            (_value.toString() !== parseInt(state._value, 10).toString() &&
             _value.toString() !== state.oldValue.toString())
        ) {
            return { _value };
        } else {
            return null;
        }
    }

    renderItem(error, disabled, defaultValue) {
        if (this.state.oldValue !== null && this.state.oldValue !== undefined) {
            this.updateTimeout && clearTimeout(this.updateTimeout);
            this.updateTimeout = setTimeout(() => {
                this.updateTimeout = null;
                this.setState({ oldValue: null });
            }, 30);
        } else if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }

        const min = this.props.schema.min || 20;
        const max = this.props.schema.max || 0xFFFF;

        let warning;
        if (this.state.ports) {
            const num = parseInt(this.state._value, 10);
            let idx = this.state.ports.findIndex(item => item.port === num && item.enabled);
            if (idx !== -1) {
                error = I18n.t('ra_Port is already used by %s', this.state.ports[idx].name);
            } else {
                idx = this.state.ports.findIndex(item => item.port === num && !item.enabled);
                if (idx !== -1) {
                    warning = true;
                    error = I18n.t('ra_Port could be used by %s', this.state.ports[idx].name);
                }
            }
        }

        if (!error && this.state._value !== null && this.state._value !== undefined) {
            if (this.state._value < min) {
                error = I18n.t('ra_Too small');
            }
            if (this.state._value > max) {
                error = I18n.t('ra_Too big');
            }
        }

        return <TextField
            variant="standard"
            type="number"
            fullWidth
            inputProps={{
                min,
                max,
                readOnly: this.props.schema.readOnly || false,
            }}
            value={this.state._value === null || this.state._value === undefined ? '' : this.state._value}
            error={!!error}
            disabled={!!disabled}
            className={warning ? this.props.classes.warning : ''}
            onChange={e => {
                const _value = e.target.value;
                if (isFinite(_value)) {
                    if (parseFloat(_value) < min) {
                        this.onError(this.props.attr, I18n.t('ra_Too small'));
                    } else if (parseFloat(_value) > max) {
                        this.onError(this.props.attr, I18n.t('ra_Too big'));
                    } else if (_value === '-' || isNaN(parseFloat(_value))) {
                        this.onError(this.props.attr, I18n.t('ra_Not a number'));
                    } else {
                        this.onError(this.props.attr); // clear error
                    }
                } else if (_value !== '') {
                    this.onError(this.props.attr, I18n.t('ra_Not a number'));
                } else {
                    this.onError(this.props.attr); // clear error
                }

                if (this.state._value !== _value) {
                    this.setState({ _value, oldValue: this.state._value }, () => {
                        if (_value.trim() === parseInt(_value, 10).toString()) {
                            this.onChange(this.props.attr, parseInt(_value, 10) || 0);
                        }
                    });
                }
            }}
            placeholder={this.getText(this.props.schema.placeholder)}
            label={this.getText(this.props.schema.label)}
            helperText={error && typeof error === 'string' ? error : this.renderHelp(this.props.schema.help, this.props.schema.helpLink, this.props.schema.noTranslation)}
        />;
    }
}

ConfigPort.propTypes = {
    socket: PropTypes.object.isRequired,
    themeType: PropTypes.string,
    themeName: PropTypes.string,
    style: PropTypes.object,
    className: PropTypes.string,
    data: PropTypes.object.isRequired,
    schema: PropTypes.object,
    onError: PropTypes.func,
    onChange: PropTypes.func,
};

export default withStyles(styles)(ConfigPort);