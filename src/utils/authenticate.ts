// @ts-nocheck
import ldap from 'ldapjs';
import { LDAP_CON, LDAP_DN } from '../config/vars';

/**
 * Authenticate user against Active Directory and check if user is in FIN_DASHBOARD_USER_G
 * @param username User ID
 * @param password User Password
 * @returns User Principal Name
 */
export const adLogin = async (username: string, password: string) => {
  const ldapCon = LDAP_CON || '';
  const ldapDN = LDAP_DN || '';

  if (!ldapCon) {
    throw new Error('No LDAP_CON specified');
  }
  if (ldapCon == 'DNU') {
    throw new Error('DNU LDAP_CON specified');
  }

  return new Promise<{
    dn: string;
    admin: boolean;
    displayName: string;
    userPrincipal: string;
  }>((resolve, reject) => {
    const userPrincipal = `${username}@${ldapDN}`;
    const adClient = ldap.createClient({
      url: ldapCon,
      tlsOptions: { rejectUnauthorized: false },
    });

    adClient.on('error', err => {
      reject('error: ' + err.message);
    });

    adClient.bind(userPrincipal, password, err => {
      if (err) {
        // @ts-ignore
        if (err.lde_message == 'Invalid Credentials') {
          reject(`INVALID CREDENTIAL: User ID: ${userPrincipal}`);
        }

        reject(`Other LDAP Error: ${JSON.stringify(err)}`);
        return;
      }

      const suffix = 'DC=' + ldapDN.toLowerCase().replace(/\./g, ',DC=');
      const filter = `(userPrincipalName=${userPrincipal})`;
      adClient.search(
        suffix,
        {
          filter: filter,
          scope: 'sub',
          attributes: ['displayName', 'memberOf'],
        },
        (err, res) => {
          if (err) {
            reject('error: ' + err.message);
            return;
          }

          res.on('searchEntry', entry => {
            const attr = entry.attributes.reduce((obj, attribute) => {
              obj[attribute.type] = attribute.values;
              return obj;
            }, {});

            // find if user if member of FIN_DASHBOARD_USER_G
            const inDashboardUserGroup = attr.memberOf.some((group: string) =>
              group.includes('APPLICATION_USER_AD_GROUP'),
            );

            // fiund if user is member of FIN_DASHBOARD_MTC_G
            const inDashboardMTCGroup = attr.memberOf.some((group: string) =>
              group.includes('APPLICATION_MTC_AD_GROUP'),
            );

            if (!inDashboardUserGroup && !inDashboardMTCGroup) {
              reject(
                `User ${userPrincipal} is not a member of FIN_DASHBOARD_USER_G or FIN_DASHBOARD_MTC_G group.`,
              );
              return;
            }

            resolve({
              dn: entry.objectName?.toString() ?? '',
              admin: inDashboardMTCGroup,
              displayName: attr.displayName[0],
              userPrincipal: userPrincipal,
            });
          });

          res.on('error', err => {
            reject('error: ' + err.message);
            return;
          });
        },
      );
    });

    adClient.unbind();
  });
};
