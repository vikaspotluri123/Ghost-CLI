##########################################################
#                                                        #
#      Ghost System-Dependency Verification Script       #
#                Created by Vikas Potluri                #
#         Influenced by Docker-install & ACME.sh         #
##########################################################

#! /bin/bash

# set -e

RED='\033[0;31m'
NC='\033[0m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NODE_INSTALL="6"
IS_INSTALLED="install ok installed"
PACKAGES=('mysql-server' nignx nodejs)

notes_mysql-server () {
  echo -e "${YELLOW}You will need to create a root pasword for MySQL. The password should be random";
  echo -e "  and contain a mix of alphanumeric characters and symbols. If you need help";
  echo -e "  creating a password, you can use one from https://randomkeygen.com${NC}";
  read -p "Press [Enter] to to contine";
}

##
## Make sure only root can run our script
##
check_root() {
  if [ "$EUID" -ne 0 ]; then
    echo "This script must be run as root. Please sudo or log in as root first."
    exit 1;
  fi
}


##
## Make sure supported OS is used
##  this is more of a suggestion rather than a requirement.
##  If you want to install it on the non-suggested OS, understand the warnings
##  then comment out the `check_os` line near the bottom of this script.
##
check_os() {
  OS=$(cat /etc/os-release | grep ^NAME | cut -d \" -f 2)
  # We only care about the major version of the release
  VERSION=$(cat /etc/os-release | grep ^VERSION_ID | cut -d \" -f 2 | cut -d \. -f 1)

  if [ "$OS" != "Ubuntu" ] || [ "$VERSION" != "16" ]; then
    echo "WARNING: Ghost offically supports Ubuntu 16.";
    echo "Using another OS may or may not work.";
    echo "Your OS is $OS $VERSION";
    exit 1;
  fi
}

##
## Updates and upgrades packages
##  @todo: Is this necessary, and if so, how can we do it
##         with as little damage as possible
##
run_update() {
  echo -e "${CYAN}Updating system${NC}"
  apt-get -qq update
  echo -e "${CYAN}Upgrading system (this might take a while, grab a cup of coffee?)${NC}"
  DEBIAN_FRONTEND=noninteractive apt-get -qq -y upgrade
  apt-get -qq clean
}

##
## Cleans up output of dpkg
## Checks the installation status of every PACKAGES
##
install_status() {
  for PACKAGE in "${PACKAGES[@]}"; do
    dpkg-query -W --showformat='${Status}' "$PACKAGE" &>/dev/null
    if [ $? -ne 0 ]; then
      TO_INSTALL+="${PACKAGE} "
      STATUS_${PACKAGE}=false
      _notes=notes_${PACKAGE}
      if [ "$(type -t "${_notes}")v" == 'functionv' ]; then
      $_notes
      fi
    else
      echo -e "${CYAN}${PACKAGE} is installed. Skipping...${NC}";
    fi
  done
  unset _HT;
}

##
## Prints info and adds node to package list if necessary
##
check_node() {
  NODE_VERSION="$(node -v |& cut -d \. -f1 | tr -d [v] | cat)"
  # @todo: (possible) add support for multiple supported versions
  # The norm is -ge, but there's the special case the incorrect version of node is installed
  if [ $((STATUS_NODE)) -lt 1 ]; then
    PACKAGE_STRING+="nodejs "
  elif [ $((STATUS_NODE)) != $((NODE_VERSION)) ]; then
    PACKAGE_STRING+="nodejs "
    echo -e "${CYAN}Node ${NODE_VERSION} is installed. Node ${NODE_INSTALL} is required.${NC}"
  else
    echo -e "${CYAN}Node ${NODE_INSTALL} is installed. Skipping...";
  fi
}

##
## Install required packages for ghost as needed
##
install_packages() {
  if [ -f "/etc/apt/sources.list.d/nodesource.list" ]; then
    echo -e "${CYAN}Node is in apt sources. Skipping addition${NC}";
  else
    echo -e "${CYAN}Adding node to apt sources${NC}";
    # @todo: dump this to /dev/null?
    curl -sL https://deb.nodesource.com/setup_${NODE_INSTALL}.x | sudo -E bash
  fi;

  PACKAGE_STRING=""
  install_status
  # Node has additional version requirements
  check_node

  #This string is concatenated w/ lots of spaces. This string will be printed
  # so make it look nice
  PACKAGE_STRING="$(echo ${PACKAGE_STRING} | sed -e's/  */ /g' | sed -e 's/^[ \t]*//')"

  if [ "${#PACKAGE_STRING}" -ge 4 ]; then
    echo -e "${CYAN}The following packages need to be installed: ${PACKAGE_STRING}${NC}";
    run_update
    echo -e "${CYAN}Installing packages${NC}";
    sleep 5;
    apt-get -qq install ${PACKAGE_STRING} -y
    if [ !$STATUS_mysql-server ]; then
      echo -e "${RED}WARNING: Your MySQL Password has been set to the value you provided. Store this password in a safe place!${NC}";
    fi
  else
    echo -e "${CYAN}No packages need to be installed${NC}";
  fi
}

##
## Installs the Ghost-CLI npm package if necessary
##

install_cli() {
  CLI_INSTALLED="$(npm list -g --depth=0 --silent --no-progress | grep 'ghost-cli@' -c |& cat)"
  if [ $CLI_INSTALLED -ge 1 ]; then
    echo -e "${CYAN}It looks like Ghost-CLI is already installed.";
    echo -e "  If you want to update ghost, run 'sudo npm i -g ghost-cli'${NC}";
  else
    echo -e "${CYAN}Installing Ghost-CLI${NC}";
    sleep 5;
    npm install -g ghost-cli --silent
  fi
}

##
## Creates directories and runs the cli if necessary
##

run_cli() {
  INSTALL_GHOST="Y"
  read -p "$(echo -e ${YELLOW})Do you want to install ghost? [Y/n] $(echo -e ${NC})" INSTALL_GHOST
  if [ "$INSTALL_GHOST" = "Y" ] || [ "$INSTALL_GHOST" = "y" ]; then
    echo -e "${CYAN}  Installing ghost to /var/www/ghost${NC}";
    mkdir -p /var/www/ghost
    ghost install -d /var/www/ghost
  else
    echo -e "${CYAN}  To install ghost later, run 'ghost install'${NC}";
  fi
}


# @todo: support for skipping steps
check_root
check_os
install_packages
install_cli
run_cli
