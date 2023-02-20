package MT::Plugin::OpenAI;

use strict;
use warnings;
use utf8;

use File::Basename qw(basename dirname);
use HTTP::Request;

sub component {
    __PACKAGE__ =~ m/::([^:]+)\z/;
}

sub plugin {
    MT->component( component() );
}

sub insert_after {
    my ( $tmpl, $id, $tokens ) = @_;

    my $before = $id ? $tmpl->getElementById($id) : undef;
    if ( $id && !$before ) {
        $before = $tmpl->getElementsByName($id)->[0];
    }

    if ( !ref $tokens ) {
        $tokens = plugin()->load_tmpl($tokens)->tokens;
    }

    foreach my $t (@$tokens) {
        $tmpl->insertAfter( $t, $before );
        $before = $t;
    }
}

sub api_key {
    plugin()->get_config_value('open_ai_api_key');
}

sub template_param_edit_entry {
    my ( $cb, $app, $param, $tmpl ) = @_;

    return unless api_key();

    my $static_path = do {
        my $plugin      = plugin();
        my $static      = $app->static_path;
        my $plugin_name = basename( $plugin->{full_path} );
        my $dir         = basename( dirname( $plugin->{full_path} ) );
        "$static$dir/$plugin_name";
    };
    my $version = plugin()->version;

    insert_after( $tmpl, 'edit_screen', 'edit_entry.tmpl' );
    insert_after(
        $tmpl,
        'edit_screen',
        [   $tmpl->createElement(
                'var',
                {   name  => 'plugin_open_ai_static_path',
                    value => $static_path,
                }
            ),
            $tmpl->createElement(
                'var',
                {   name  => 'plugin_open_ai_version',
                    value => $version,
                }
            ),
        ]
    );
}

sub generate_title {
    my ($app) = @_;

    my $api_key = api_key();

    my $ua  = MT->new_ua( { timeout => 60 } );
    my $req = HTTP::Request->new(
        'POST',
        'https://api.openai.com/v1/completions',
        [   'Content-Type'  => 'application/json',
            'Authorization' => "Bearer $api_key",
        ],
        Encode::encode(
            'UTF-8',
            MT::Util::to_json(
                {   model  => 'text-davinci-003',
                    prompt => <<PROMPT,
I want you to act as a title generator for written pieces. I will provide you with the first part of an article, and you will generate five attention-grabbing titles in Japanese. Please keep the title concise and under 20 words, and ensure that the meaning is maintained. My topic is

@{[scalar $app->param('content')]}
PROMPT
                    ,
                    temperature => 0.6,
                    max_tokens  => 1500,
                }
            )
        )
    );

    my $res = $ua->request($req);
    if ( !$res->is_success ) {
        return $app->json_error( $res->status_line );
    }

    my $res_data = MT::Util::from_json( Encode::decode( 'UTF-8', $res->content ) );

    $app->json_result( { choices => $res_data->{choices} } );
}

1;
