import { useState, type ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpenOutlined';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { t } from '../i18n';

interface Props {
  children: ReactNode;
  onNewOffer: () => void;
  onLogout?: () => void;
  badge?: ReactNode;
}

export function AppLayout({ children, onNewOffer, onLogout, badge }: Props) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const navLinks = [
    { to: '/offers', label: t.nav.savedOffers, icon: <FolderOpenIcon fontSize="small" /> },
    { to: '/materials', label: t.nav.rawMaterials, icon: <ScienceIcon fontSize="small" /> },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1, px: { xs: 2, sm: 3 } }}>
          <Typography
            component={RouterLink}
            to="/"
            variant="h3"
            noWrap
            sx={{ color: 'primary.main', textDecoration: 'none', flexGrow: 1, fontWeight: 700 }}
          >
            {compact ? 'Nutrikal' : t.appName}
          </Typography>
          {badge}
          <Button variant="contained" startIcon={<AddIcon />} onClick={onNewOffer} sx={{ flexShrink: 0 }}>
            {t.nav.newOffer}
          </Button>
          {compact ? (
            <>
              <IconButton aria-label={t.nav.menu} onClick={(e) => setAnchor(e.currentTarget)}>
                <MenuIcon />
              </IconButton>
              <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                {navLinks.map((l) => (
                  <MenuItem key={l.to} component={RouterLink} to={l.to} onClick={() => setAnchor(null)}>
                    <ListItemIcon>{l.icon}</ListItemIcon>
                    <ListItemText>{l.label}</ListItemText>
                  </MenuItem>
                ))}
                {onLogout && <Divider />}
                {onLogout && (
                  <MenuItem
                    onClick={() => {
                      setAnchor(null);
                      onLogout();
                    }}
                  >
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t.nav.logout}</ListItemText>
                  </MenuItem>
                )}
              </Menu>
            </>
          ) : (
            <>
              {navLinks.map((l) => (
                <Button
                  key={l.to}
                  component={RouterLink}
                  to={l.to}
                  startIcon={l.icon}
                  color={location.pathname.startsWith(l.to) ? 'primary' : 'inherit'}
                >
                  {l.label}
                </Button>
              ))}
              {onLogout && (
                <Button color="inherit" startIcon={<LogoutIcon />} onClick={onLogout}>
                  {t.nav.logout}
                </Button>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        {children}
      </Container>
    </Box>
  );
}
